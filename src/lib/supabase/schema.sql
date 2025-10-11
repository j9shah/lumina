-- Enable Row Level Security (RLS) and Realtime
ALTER publication supabase_realtime ADD TABLE canvas_sessions;
ALTER publication supabase_realtime ADD TABLE drawing_events;
ALTER publication supabase_realtime ADD TABLE user_presence;

-- Canvas Sessions Table
CREATE TABLE IF NOT EXISTS canvas_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  canvas_data JSONB DEFAULT '{}',
  max_users INTEGER DEFAULT 10
);

-- Drawing Events Table (for real-time sync)
CREATE TABLE IF NOT EXISTS drawing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES canvas_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'draw', 'erase', 'clear', 'text', 'bucket'
  event_data JSONB NOT NULL, -- drawing coordinates, tool settings, etc.
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sequence_number BIGSERIAL
);

-- User Presence Table (who's currently in session)
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES canvas_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cursor_x FLOAT DEFAULT 0,
  cursor_y FLOAT DEFAULT 0,
  current_tool TEXT DEFAULT 'brush',
  current_color TEXT DEFAULT '#000000',
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(session_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE canvas_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for canvas_sessions
CREATE POLICY "Users can view all active sessions" ON canvas_sessions
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can create sessions" ON canvas_sessions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Session creators can update their sessions" ON canvas_sessions
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for drawing_events
CREATE POLICY "Users can view events from sessions they're in" ON drawing_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_presence 
      WHERE user_presence.session_id = drawing_events.session_id 
      AND user_presence.user_id = auth.uid()
      AND user_presence.is_active = TRUE
    )
  );

CREATE POLICY "Users can insert events to sessions they're in" ON drawing_events
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_presence 
      WHERE user_presence.session_id = drawing_events.session_id 
      AND user_presence.user_id = auth.uid()
      AND user_presence.is_active = TRUE
    )
  );

-- RLS Policies for user_presence
CREATE POLICY "Users can view presence in sessions they're in" ON user_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_presence up
      WHERE up.session_id = user_presence.session_id 
      AND up.user_id = auth.uid()
      AND up.is_active = TRUE
    )
  );

CREATE POLICY "Users can manage their own presence" ON user_presence
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drawing_events_session_timestamp ON drawing_events(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_drawing_events_sequence ON drawing_events(session_number);
CREATE INDEX IF NOT EXISTS idx_user_presence_session_active ON user_presence(session_id, is_active);
CREATE INDEX IF NOT EXISTS idx_canvas_sessions_active ON canvas_sessions(is_active, created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for canvas_sessions
CREATE TRIGGER update_canvas_sessions_updated_at 
  BEFORE UPDATE ON canvas_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up inactive presence
CREATE OR REPLACE FUNCTION cleanup_inactive_presence()
RETURNS void AS $$
BEGIN
  UPDATE user_presence 
  SET is_active = FALSE 
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ language 'plpgsql';