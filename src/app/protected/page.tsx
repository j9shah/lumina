
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
      background: "#181f2a",
      padding: "4rem 0 0 6vw",
      display: "block"
    }}>
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        background: 'none',
        borderRadius: '0',
        padding: '0',
        boxShadow: 'none',
        textAlign: 'left'
      }}>
        {user && (
          <div style={{
            marginBottom: '2.5rem',
          }}>
            <div style={{ color: '#38bdf8', fontSize: '1.2rem', fontWeight: 600 }}>
              Welcome back, {user.email}!
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'stretch' }}>
          {/* Create New Session Card */}
          <div style={{
            flex: 1,
            background: '#232b3a',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: 'none'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#10b981', fontSize: '2.2rem', fontWeight: 700 }}>
              Start New Session
            </h3>
            <p style={{ color: '#cbd5e1', margin: '0 0 2rem 0', fontSize: '1.2rem' }}>
              Create a fresh canvas and invite others to collaborate
            </p>
            <button
              onClick={createNewSession}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '20px 0',
                fontSize: '1.3rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'none',
                width: '100%'
              }}
            >
              Create New Canvas
            </button>
          </div>

          {/* Join Existing Session Card */}
          <div style={{
            flex: 1,
            background: '#232b3a',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: 'none'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#38bdf8', fontSize: '2.2rem', fontWeight: 700 }}>
              Join Existing Session
            </h3>
            <p style={{ color: '#cbd5e1', margin: '0 0 2rem 0', fontSize: '1.2rem' }}>
              Enter a session ID to join someone else&apos;s canvas
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID..."
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#181f2a',
                  color: '#fff',
                  fontSize: '1.1rem',
                  boxSizing: 'border-box'
                }}
                onKeyPress={(e) => e.key === 'Enter' && joinSession()}
              />
              <button
                onClick={joinSession}
                disabled={!sessionId.trim()}
                style={{
                  background: sessionId.trim() ? '#38bdf8' : '#4a5568',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '18px 0',
                  fontSize: '1.1rem',
                  fontWeight: 700,
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
                    background: 'none',
                    color: '#38bdf8',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 0',
                    fontSize: '1rem',
                    fontWeight: 600,
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
