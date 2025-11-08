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
    <div className="min-h-[calc(100vh-60px)] bg-[#0d0d0d] px-8 py-12">
      <div className="max-w-6xl mx-auto">
        {user && (
          <div className="mb-8 p-4 rounded-lg bg-white/[0.03] border border-white/10">
            <p className="text-sm text-gray-400">
              Signed in as <span className="text-white font-medium">{user.email}</span>
            </p>
          </div>
        )}

        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">Canvas sessions</h1>
          <p className="text-gray-400">Create a new canvas or join an existing one</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create New Session Card */}
          <div className="p-8 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              New canvas
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Start fresh and invite others to collaborate
            </p>
            <button
              onClick={createNewSession}
              className="w-full px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition"
            >
              Create canvas
            </button>
          </div>

          {/* Join Existing Session Card */}
          <div className="p-8 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Join session
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Enter a session ID to collaborate
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Paste session ID..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                onKeyPress={(e) => e.key === 'Enter' && joinSession()}
              />
              <button
                onClick={joinSession}
                disabled={!sessionId.trim()}
                className={`w-full px-6 py-3 font-medium rounded-lg transition ${
                  sessionId.trim() 
                    ? 'bg-white text-black hover:bg-gray-100' 
                    : 'bg-white/10 text-gray-600 cursor-not-allowed'
                }`}
              >
                Join canvas
              </button>
              {sessionId.trim() && (
                <button
                  onClick={shareCurrentUrl}
                  className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg hover:border-white/20 transition"
                >
                  Copy link
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
