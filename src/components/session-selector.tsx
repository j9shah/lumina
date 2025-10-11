"use client";
import React, { useState, useEffect } from 'react';
import { CanvasSession } from '@/lib/types/collaboration';
import { collaborationService } from '@/lib/services/collaboration';

interface SessionSelectorProps {
  onSessionSelect: (sessionId: string) => void;
  onCreateSession: () => void;
}

export default function SessionSelector({ onSessionSelect, onCreateSession }: SessionSelectorProps) {
  const [sessions, setSessions] = useState<CanvasSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    const activeSessions = await collaborationService.getActiveSessions();
    setSessions(activeSessions);
    setLoading(false);
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;

    setCreating(true);
    const session = await collaborationService.createSession(newSessionName.trim());
    
    if (session) {
      setNewSessionName('');
      setShowCreateForm(false);
      onSessionSelect(session.id);
    }
    setCreating(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        color: '#cbd5e1'
      }}>
        <div>Loading sessions...</div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem',
      color: '#fff'
    }}>
      <div style={{
        background: '#232b3a',
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 4px 32px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            margin: 0,
            color: '#fff'
          }}>
            🎨 Collaborative Sessions
          </h1>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              background: '#38bdf8',
              color: '#181f2a',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(56, 189, 248, 0.3)'
            }}
          >
            + New Session
          </button>
        </div>

        {showCreateForm && (
          <div style={{
            background: '#181f2a',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '2px solid #38bdf8'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8' }}>Create New Session</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Enter session name..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #4a5568',
                  background: '#232b3a',
                  color: '#fff',
                  fontSize: '16px'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
              />
              <button
                onClick={handleCreateSession}
                disabled={creating || !newSessionName.trim()}
                style={{
                  background: creating ? '#4a5568' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: creating ? 'not-allowed' : 'pointer'
                }}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewSessionName('');
                }}
                style={{
                  background: '#6b7280',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: '#94a3b8'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>No active sessions</h3>
            <p style={{ margin: 0 }}>Create a new session to start collaborating!</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
          }}>
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                style={{
                  background: '#181f2a',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#38bdf8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: '#fff'
                  }}>
                    {session.name}
                  </h3>
                  <span style={{
                    background: '#10b981',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    ACTIVE
                  </span>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  marginBottom: '0.5rem'
                }}>
                  Created {formatDate(session.created_at)}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#cbd5e1'
                }}>
                  Click to join session
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '14px'
        }}>
          💡 Tip: Multiple users can paint on the same canvas in real-time!
        </div>
      </div>
    </div>
  );
}