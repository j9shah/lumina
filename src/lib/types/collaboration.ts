export interface CanvasSession {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  canvas_data: any;
  max_users: number;
}

export interface DrawingEvent {
  id: string;
  session_id: string;
  user_id: string;
  event_type: 'draw' | 'erase' | 'clear' | 'text' | 'bucket';
  event_data: {
    tool: string;
    color?: string;
    size?: number;
    points?: { x: number; y: number }[];
    startPos?: { x: number; y: number };
    endPos?: { x: number; y: number };
    text?: string;
    textSize?: number;
  };
  timestamp: string;
  sequence_number: number;
}

export interface UserPresence {
  id: string;
  session_id: string;
  user_id: string;
  last_seen: string;
  cursor_x: number;
  cursor_y: number;
  current_tool: string;
  current_color: string;
  is_active: boolean;
  user_email?: string; // Joined from auth.users
}

export interface CollaborativeCanvasState {
  session: CanvasSession | null;
  users: UserPresence[];
  isConnected: boolean;
  currentUser: UserPresence | null;
}