
"use client";
import React, { useState, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ProtectedPage() {
  const [user, setUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const generateSessionId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${timestamp}-${random}`;
  };

  const createNewSession = () => {
    const newSessionId = generateSessionId();
    router.push(`/protected/canvas/${newSessionId}`);
  };

  const joinSession = () => {
    if (sessionId.trim()) {
      router.push(`/protected/canvas/${sessionId.trim()}`);
    }
  };

  const shareCurrentUrl = () => {
    const currentUrl = window.location.origin + `/protected/canvas/${sessionId}`;
    navigator.clipboard.writeText(currentUrl);
    alert('Session link copied to clipboard!');
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      background: "#f5f5f5",
      padding: "2rem",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: '#ffffff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {user && (
          <div style={{
            marginBottom: '2rem',
            padding: '0.75rem 1rem',
            background: '#e8f5e8',
            border: '1px solid #c3e6c3',
            borderRadius: '3px'
          }}>
            <div style={{ color: '#2d5a2d', fontSize: '14px' }}>
              Welcome back, {user.email}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Create New Session */}
          <div style={{
            flex: 1,
            border: '1px solid #ccc',
            borderRadius: '3px',
            padding: '1.5rem',
            background: '#fafafa'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '18px', fontWeight: 'bold' }}>
              Start New Session
            </h3>
            <p style={{ color: '#666', margin: '0 0 1.5rem 0', fontSize: '14px', lineHeight: '1.4' }}>
              Create a fresh canvas and invite others to collaborate
            </p>
            <button
              onClick={createNewSession}
              style={{
                background: '#4a90e2',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 'normal',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Create New Canvas
            </button>
          </div>

          {/* Join Existing Session */}
          <div style={{
            flex: 1,
            border: '1px solid #ccc',
            borderRadius: '3px',
            padding: '1.5rem',
            background: '#fafafa'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '18px', fontWeight: 'bold' }}>
              Join Existing Session
            </h3>
            <p style={{ color: '#666', margin: '0 0 1.5rem 0', fontSize: '14px', lineHeight: '1.4' }}>
              Enter a session ID to join someone else's canvas
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ccc',
                  background: '#fff',
                  color: '#333',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
                onKeyPress={(e) => e.key === 'Enter' && joinSession()}
              />
              <button
                onClick={joinSession}
                disabled={!sessionId.trim()}
                style={{
                  background: sessionId.trim() ? '#4a90e2' : '#ccc',
                  color: '#fff',
                  border: '1px solid #ccc',
                  padding: '12px',
                  fontSize: '1rem',
                  fontWeight: 'normal',
                  cursor: sessionId.trim() ? 'pointer' : 'not-allowed',
                  width: '100%'
                }}
              >
                Join
              </button>
              {sessionId.trim() && (
                <button
                  onClick={shareCurrentUrl}
                  style={{
                    background: '#fff',
                    color: '#4a90e2',
                    border: '1px solid #4a90e2',
                    padding: '10px',
                    fontSize: '1rem',
                    fontWeight: 'normal',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Copy Share Link
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
