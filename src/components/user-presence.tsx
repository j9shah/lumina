"use client";
import React from 'react';
import { UserPresence } from '@/lib/types/collaboration';

interface UserPresenceIndicatorProps {
  users: UserPresence[];
  currentUserId: string | null;
}

export default function UserPresenceIndicator({ users, currentUserId }: UserPresenceIndicatorProps) {
  const otherUsers = users.filter(user => user.user_id !== currentUserId);

  return (
    <div style={{
      position: 'fixed',
      top: '70px',
      right: '20px',
      zIndex: 1000,
      background: 'rgba(35, 43, 58, 0.95)',
      borderRadius: '16px',
      padding: '16px',
      minWidth: '250px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: otherUsers.length > 0 ? '12px' : '0',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600
      }}>
        <span style={{ fontSize: '16px' }}>👥</span>
        Online ({users.length})
      </div>

      {otherUsers.length === 0 ? (
        <div style={{
          color: '#94a3b8',
          fontSize: '12px',
          fontStyle: 'italic'
        }}>
          You're painting alone
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {otherUsers.map((user) => (
            <div
              key={user.user_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: '8px',
                background: 'rgba(24, 31, 42, 0.5)'
              }}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                flexShrink: 0
              }} />
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user.user_email || `User ${user.user_id.slice(0, 8)}`}
                </div>
                <div style={{
                  color: '#94a3b8',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    background: user.current_color || '#000000'
                  }} />
                  {getToolEmoji(user.current_tool)} {user.current_tool}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cursors overlay */}
      {otherUsers.map((user) => (
        <UserCursor
          key={user.user_id}
          user={user}
          color={user.current_color || '#000000'}
        />
      ))}
    </div>
  );
}

interface UserCursorProps {
  user: UserPresence;
  color: string;
}

function UserCursor({ user, color }: UserCursorProps) {
  return (
    <div
      style={{
        position: 'fixed',
        left: `${user.cursor_x}px`,
        top: `${user.cursor_y}px`,
        zIndex: 999,
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Cursor dot */}
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: color,
        border: '2px solid #fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        {/* User label */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: color,
          color: '#fff',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {user.user_email?.split('@')[0] || `User ${user.user_id.slice(0, 4)}`}
        </div>
      </div>
      
      {/* Tool indicator */}
      <div style={{
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        background: '#232b3a',
        borderRadius: '50%',
        width: '16px',
        height: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '8px',
        border: '1px solid #fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
      }}>
        {getToolEmoji(user.current_tool)}
      </div>
    </div>
  );
}

function getToolEmoji(tool: string): string {
  switch (tool) {
    case 'brush': return '🖌️';
    case 'pencil': return '✏️';
    case 'eraser': return '🩹';
    case 'bucket': return '🪣';
    case 'text': return '🅣';
    default: return '🖌️';
  }
}