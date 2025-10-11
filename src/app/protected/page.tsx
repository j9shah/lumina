
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
      padding: "2rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        background: '#232b3a',
        borderRadius: '24px',
        padding: '3rem',
        boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        {user && (
          <div style={{
            background: '#181f2a',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem',
            border: '2px solid #38bdf8'
          }}>
            <div style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 600 }}>
              Welcome back, {user.email}!
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'stretch' }}>
          {/* Create New Session */}
          <div style={{
            flex: 1,
            background: '#181f2a',
            borderRadius: '16px',
            padding: '2rem',
            border: '2px solid #10b981'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#10b981', fontSize: '1.3rem' }}>
              Start New Session
            </h3>
            <p style={{ color: '#cbd5e1', margin: '0 0 1.5rem 0', fontSize: '14px' }}>
              Create a fresh canvas and invite others to collaborate
            </p>
            <button
              onClick={createNewSession}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.3)';
              }}
            >
              Create New Canvas
            </button>
          </div>

          {/* Join Existing Session */}
          <div style={{
            flex: 1,
            background: '#181f2a',
            borderRadius: '16px',
            padding: '2rem',
            border: '2px solid #38bdf8'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8', fontSize: '1.3rem' }}>
              Join Existing Session
            </h3>
            <p style={{ color: '#cbd5e1', margin: '0 0 1.5rem 0', fontSize: '14px' }}>
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
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '2px solid #4a5568',
                  background: '#232b3a',
                  color: '#fff',
                  fontSize: '16px',
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
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: sessionId.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  width: '100%'
                }}
              >
                Join
              </button>
              
              {sessionId.trim() && (
                <button
                  onClick={shareCurrentUrl}
                  style={{
                    background: 'transparent',
                    color: '#38bdf8',
                    border: '2px solid #38bdf8',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#38bdf8';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#38bdf8';
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
