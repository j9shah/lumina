import { createClient } from '@/lib/supabase/client';
import { CanvasSession, DrawingEvent, UserPresence } from '@/lib/types/collaboration';

export class CollaborationService {
  private supabase = createClient();
  private currentSessionId: string | null = null;
  private currentUserId: string | null = null;
  private presenceUpdateInterval: NodeJS.Timeout | null = null;

  // Session Management
  async createSession(name: string): Promise<CanvasSession | null> {
    try {
      const { data: session, error } = await this.supabase
        .from('canvas_sessions')
        .insert([{ name, is_active: true }])
        .select()
        .single();

      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  async getActiveSessions(): Promise<CanvasSession[]> {
    try {
      const { data: sessions, error } = await this.supabase
        .from('canvas_sessions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return sessions || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  async joinSession(sessionId: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return false;

      this.currentSessionId = sessionId;
      this.currentUserId = user.id;

      // Add or update user presence
      const { error } = await this.supabase
        .from('user_presence')
        .upsert([{
          session_id: sessionId,
          user_id: user.id,
          is_active: true,
          last_seen: new Date().toISOString(),
          current_tool: 'brush',
          current_color: '#000000'
        }]);

      if (error) throw error;

      // Start presence heartbeat
      this.startPresenceHeartbeat();
      return true;
    } catch (error) {
      console.error('Error joining session:', error);
      return false;
    }
  }

  async leaveSession(): Promise<void> {
    if (!this.currentSessionId || !this.currentUserId) return;

    try {
      // Mark user as inactive
      await this.supabase
        .from('user_presence')
        .update({ is_active: false })
        .eq('session_id', this.currentSessionId)
        .eq('user_id', this.currentUserId);

      this.stopPresenceHeartbeat();
      this.currentSessionId = null;
      this.currentUserId = null;
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  }

  // Drawing Events
  async sendDrawingEvent(eventType: DrawingEvent['event_type'], eventData: DrawingEvent['event_data']): Promise<void> {
    if (!this.currentSessionId || !this.currentUserId) return;

    try {
      const { error } = await this.supabase
        .from('drawing_events')
        .insert([{
          session_id: this.currentSessionId,
          user_id: this.currentUserId,
          event_type: eventType,
          event_data: eventData,
          timestamp: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending drawing event:', error);
    }
  }

  // Real-time subscriptions
  subscribeToDrawingEvents(onEvent: (event: DrawingEvent) => void) {
    if (!this.currentSessionId) return null;

    return this.supabase
      .channel(`drawing_events_${this.currentSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'drawing_events',
          filter: `session_id=eq.${this.currentSessionId}`
        },
        (payload) => {
          const event = payload.new as DrawingEvent;
          // Don't replay our own events
          if (event.user_id !== this.currentUserId) {
            onEvent(event);
          }
        }
      )
      .subscribe();
  }

  subscribeToUserPresence(onPresenceUpdate: (users: UserPresence[]) => void) {
    if (!this.currentSessionId) return null;

    return this.supabase
      .channel(`presence_${this.currentSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `session_id=eq.${this.currentSessionId}`
        },
        async () => {
          // Fetch updated presence data
          const users = await this.getSessionUsers();
          onPresenceUpdate(users);
        }
      )
      .subscribe();
  }

  async getSessionUsers(): Promise<UserPresence[]> {
    if (!this.currentSessionId) return [];

    try {
      const { data: users, error } = await this.supabase
        .from('user_presence')
        .select('*')
        .eq('session_id', this.currentSessionId)
        .eq('is_active', true);

      if (error) throw error;
      return users || [];
    } catch (error) {
      console.error('Error fetching session users:', error);
      return [];
    }
  }

  // Presence Management
  async updateCursorPosition(x: number, y: number): Promise<void> {
    if (!this.currentSessionId || !this.currentUserId) return;

    try {
      await this.supabase
        .from('user_presence')
        .update({
          cursor_x: x,
          cursor_y: y,
          last_seen: new Date().toISOString()
        })
        .eq('session_id', this.currentSessionId)
        .eq('user_id', this.currentUserId);
    } catch (error) {
      console.error('Error updating cursor position:', error);
    }
  }

  async updateToolState(tool: string, color: string): Promise<void> {
    if (!this.currentSessionId || !this.currentUserId) return;

    try {
      await this.supabase
        .from('user_presence')
        .update({
          current_tool: tool,
          current_color: color,
          last_seen: new Date().toISOString()
        })
        .eq('session_id', this.currentSessionId)
        .eq('user_id', this.currentUserId);
    } catch (error) {
      console.error('Error updating tool state:', error);
    }
  }

  private startPresenceHeartbeat(): void {
    this.presenceUpdateInterval = setInterval(async () => {
      if (this.currentSessionId && this.currentUserId) {
        await this.supabase
          .from('user_presence')
          .update({ last_seen: new Date().toISOString() })
          .eq('session_id', this.currentSessionId)
          .eq('user_id', this.currentUserId);
      }
    }, 30000); // Update every 30 seconds
  }

  private stopPresenceHeartbeat(): void {
    if (this.presenceUpdateInterval) {
      clearInterval(this.presenceUpdateInterval);
      this.presenceUpdateInterval = null;
    }
  }

  // Cleanup
  cleanup(): void {
    this.leaveSession();
  }
}

// Singleton instance
export const collaborationService = new CollaborationService();