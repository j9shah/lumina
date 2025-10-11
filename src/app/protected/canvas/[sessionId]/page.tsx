"use client";
import React, { useRef, useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

const TOOLS = [
  { key: "brush", label: "🖌️ Brush" },
  { key: "pencil", label: "✏️ Pencil" },
  { key: "eraser", label: "🩹 Eraser" },
  { key: "bucket", label: "🪣 Bucket" },
  { key: "text", label: "🅣 Text" },
];

interface DrawingEvent {
  type: 'draw' | 'erase' | 'clear' | 'text' | 'bucket';
  data: any;
  user: string;
  timestamp: number;
}

interface UserCursor {
  x: number;
  y: number;
  user: string;
  email: string;
  tool: string;
  color: string;
}

export default function SharedCanvasPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const supabase = createClient();
  
  // Drawing state
  const [tool, setTool] = useState<string>("brush");
  const [color, setColor] = useState<string>("#000000");
  const [size, setSize] = useState<number>(8);
  const [textSize, setTextSize] = useState<number>(24);
  const [drawing, setDrawing] = useState<boolean>(false);
  const [lastPos, setLastPos] = useState<{x:number, y:number}|null>(null);
  
  // Collaboration state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map());
  const [connectedUsers, setConnectedUsers] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<any>(null);

  // Initialize user and real-time connection
  useEffect(() => {
    const initializeCollaboration = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUser(user);
      
      // Create real-time channel for this session
      const realtimeChannel = supabase.channel(`canvas_${sessionId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: user.id }
        }
      });

      // Handle drawing events
      realtimeChannel.on('broadcast', { event: 'drawing' }, (payload) => {
        if (payload.payload.user !== user.id) {
          handleRemoteDrawing(payload.payload);
        }
      });

      // Handle cursor movements
      realtimeChannel.on('broadcast', { event: 'cursor' }, (payload) => {
        if (payload.payload.user !== user.id) {
          setCursors(prev => {
            const newCursors = new Map(prev);
            newCursors.set(payload.payload.user, payload.payload);
            return newCursors;
          });
        }
      });

      // Handle user presence
      realtimeChannel.on('presence', { event: 'sync' }, () => {
        const state = realtimeChannel.presenceState();
        const users = new Set(Object.keys(state));
        setConnectedUsers(users);
      });

      realtimeChannel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key);
      });

      realtimeChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.delete(key);
          return newCursors;
        });
      });

      // Subscribe to channel
      realtimeChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await realtimeChannel.track({
            user_id: user.id,
            email: user.email,
            online_at: new Date().toISOString(),
          });
        }
      });

      setChannel(realtimeChannel);
    };

    initializeCollaboration();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [sessionId]);

  // Canvas initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    
    function resizeCanvas() {
      if (!canvas) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      
      const container = canvas.parentElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const w = containerRect.width * 0.95;
      const h = containerRect.height * 0.95;
      
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = false;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
    
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    
    const container = canvas.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }
    
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      resizeObserver.disconnect();
    };
  }, []);

  // Handle remote drawing events
  const handleRemoteDrawing = (event: DrawingEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    switch (event.type) {
      case 'draw':
      case 'erase':
        if (event.data.points && event.data.points.length > 1) {
          if (event.type === 'erase') {
            ctx.globalCompositeOperation = "destination-out";
            ctx.lineWidth = event.data.size || 8;
          } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = event.data.color || '#000000';
            ctx.lineWidth = event.data.size || 8;
          }
          
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(event.data.points[0].x, event.data.points[0].y);
          
          for (let i = 1; i < event.data.points.length; i++) {
            ctx.lineTo(event.data.points[i].x, event.data.points[i].y);
          }
          ctx.stroke();
        }
        break;
        
      case 'clear':
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
        
      case 'text':
        if (event.data.pos && event.data.text) {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = event.data.color || '#000000';
          ctx.font = `${event.data.textSize || 24}px Arial, sans-serif`;
          ctx.textBaseline = "top";
          ctx.fillText(event.data.text, event.data.pos.x, event.data.pos.y);
        }
        break;
    }
  };

  // Drawing functions
  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return {x:0, y:0};
    const r = canvas.getBoundingClientRect();
    if ("touches" in e && e.touches.length) {
      return {
        x: e.touches[0].clientX - r.left,
        y: e.touches[0].clientY - r.top,
      };
    } else if ("clientX" in e) {
      return {
        x: (e as React.MouseEvent).clientX - r.left,
        y: (e as React.MouseEvent).clientY - r.top,
      };
    }
    return {x:0, y:0};
  }

  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);

  function handleDown(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const p = getPos(e);
    
    if (tool === "text") {
      const t = prompt("Enter text:");
      if (!t || !ctx) return;
      ctx.save(); 
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = color; 
      ctx.font = textSize + "px Arial, sans-serif"; 
      ctx.textBaseline = "top";
      ctx.fillText(t, p.x, p.y); 
      ctx.restore();
      
      // Broadcast text event
      if (channel && currentUser) {
        channel.send({
          type: 'broadcast',
          event: 'drawing',
          payload: {
            type: 'text',
            data: { pos: p, text: t, color, textSize },
            user: currentUser.id,
            timestamp: Date.now()
          }
        });
      }
      return;
    }
    
    setDrawing(true);
    setLastPos(p);
    setCurrentPath([p]);
    
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      
      if (tool === "brush" || tool === "pencil") {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size/2, 0, Math.PI * 2);
        ctx.fill();
      } else if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(p.x, p.y, size/2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    e.preventDefault();
  }

  function handleMove(e: React.MouseEvent | React.TouchEvent) {
    const p = getPos(e);
    
    // Always broadcast cursor position
    if (channel && currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          x: p.x,
          y: p.y,
          user: currentUser.id,
          email: currentUser.email,
          tool,
          color
        }
      });
    }
    
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !lastPos) return;
    
    setCurrentPath(prev => [...prev, p]);
    
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = size;
    } else if (tool === "brush") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = size;
    } else if (tool === "pencil") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.lineWidth = Math.max(1, size/2);
    }
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setLastPos(p);
    e.preventDefault();
  }

  function handleUp() {
    if (!drawing) return;
    setDrawing(false);
    setLastPos(null);
    
    // Broadcast completed path
    if (channel && currentUser && currentPath.length > 0) {
      const eventType = tool === 'eraser' ? 'erase' : 'draw';
      channel.send({
        type: 'broadcast',
        event: 'drawing',
        payload: {
          type: eventType,
          data: { points: currentPath, color, size, tool },
          user: currentUser.id,
          timestamp: Date.now()
        }
      });
    }
    
    setCurrentPath([]);
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Broadcast clear event
    if (channel && currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'drawing',
        payload: {
          type: 'clear',
          data: {},
          user: currentUser.id,
          timestamp: Date.now()
        }
      });
    }
  }

  function handleSave(mime: string, name: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL(mime);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === "b") setTool("brush");
      else if (k === "p") setTool("pencil");
      else if (k === "e") setTool("eraser");
      else if (k === "f") setTool("bucket");
      else if (k === "t") setTool("text");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-sidebar {
            width: 200px !important;
            min-width: 180px !important;
            padding: 16px !important;
          }
          .mobile-main {
            padding: 8px !important;
          }
          .mobile-canvas-container {
            border-radius: 12px !important;
            padding: 1% !important;
          }
        }
        @media (max-width: 480px) {
          .mobile-sidebar {
            width: 160px !important;
            min-width: 140px !important;
            padding: 12px !important;
          }
          .mobile-main {
            padding: 4px !important;
          }
        }
      `}</style>
      
      <div style={{ 
        display: "flex", 
        minHeight: "calc(100vh - 60px)", 
        height: "calc(100vh - 60px)",
        background: "#181f2a", 
        padding: 0, 
        overflow: "hidden",
        position: "fixed",
        top: "60px",
        left: 0,
        right: 0,
        bottom: 0
      }}>
        <aside className="mobile-sidebar" style={{ 
          width: "min(260px, 25vw)", 
          minWidth: 220, 
          background: "#232b3a", 
          borderRight: "1px solid #232b3a", 
          padding: 24, 
          display: "flex", 
          flexDirection: "column", 
          gap: 24, 
          boxShadow: "2px 0 16px 0 #0002",
          overflowY: "auto" 
        }}>
          <div>
            <h1 style={{ margin: "0 0 12px", fontSize: 22, color: "#fff", fontWeight: 700, letterSpacing: 1 }}>
              Lumina Paint
            </h1>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>
              Session: {sessionId}
            </div>
            <div style={{ fontSize: 12, color: "#10b981", marginBottom: 16 }}>
              👥 {connectedUsers.size} user{connectedUsers.size !== 1 ? 's' : ''} online
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {TOOLS.map(t => (
              <button
                key={t.key}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "none",
                  background: tool === t.key ? "#0f172a" : "#232b3a",
                  color: tool === t.key ? "#fff" : "#cbd5e1",
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: "pointer",
                  boxShadow: tool === t.key ? "0 2px 8px #0003" : "none",
                  marginBottom: 4,
                  outline: tool === t.key ? "2px solid #38bdf8" : "none",
                  transition: "all 0.2s",
                }}
                onClick={() => setTool(t.key)}
                title={t.label}
              >
                {t.label}
              </button>
            ))}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#cbd5e1", fontWeight: 500 }}>
              <span>Color</span>
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                style={{ width: 44, height: 32, border: "none", borderRadius: 8, background: "#fff" }}
              />
            </label>
            {tool !== "text" && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#cbd5e1", fontWeight: 500 }}>
                <span>Size</span>
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={size}
                  onChange={e => setSize(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <span style={{ color: "#38bdf8", fontWeight: 700 }}>{size}</span>
              </label>
            )}
            {tool === "text" && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#cbd5e1", fontWeight: 500 }}>
                <span>Text Size</span>
                <input
                  type="range"
                  min={8}
                  max={96}
                  value={textSize}
                  onChange={e => setTextSize(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <span style={{ color: "#38bdf8", fontWeight: 700 }}>{textSize}</span>
              </label>
            )}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              style={{ 
                background: "linear-gradient(135deg, #10b981, #059669)", 
                color: "#fff", 
                border: "none", 
                borderRadius: 12, 
                padding: "12px 14px", 
                fontSize: 16, 
                fontWeight: 700, 
                cursor: "pointer", 
                marginBottom: 4, 
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)" 
              }}
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
                alert(`Session link copied!\n\nShare this URL:\n${url}\n\nOr share session ID: ${sessionId}`);
              }}
              title="Copy shareable link for collaboration"
            >
              🔗 Share Session
            </button>
            <button
              style={{ background: "#232b3a", color: "#fff", border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 16, fontWeight: 500, cursor: "pointer", marginBottom: 4, boxShadow: "0 2px 8px #0002" }}
              onClick={handleClear}
            >Clear</button>
            <button
              style={{ background: "#38bdf8", color: "#181f2a", border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 4, boxShadow: "0 2px 8px #38bdf8" }}
              onClick={() => handleSave("image/png", "artwork.png")}
            >Save PNG</button>
          </div>
          
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, fontWeight: 500 }}>
            Tip: B/P/E/F/T to switch tools.
          </p>
        </aside>

        <main className="mobile-main" style={{ 
          flex: 1, 
          padding: "min(16px, 1vw)", 
          background: "#181f2a", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          height: "100%",
          overflow: "hidden",
          position: "relative"
        }}>
          <div className="mobile-canvas-container" style={{ 
            width: "100%", 
            height: "100%", 
            background: "#232b3a", 
            borderRadius: 24, 
            boxShadow: "0 4px 32px #0004", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            padding: "2%",
            position: "relative"
          }}>
            <canvas
              ref={canvasRef}
              id="canvas"
              style={{ 
                width: "100%", 
                height: "100%", 
                background: "#fff", 
                border: "2px solid #38bdf8", 
                borderRadius: 18, 
                display: "block", 
                touchAction: "none", 
                boxShadow: "0 2px 16px #38bdf8",
                cursor: tool === "brush" ? "crosshair" : tool === "eraser" ? "grab" : "pointer"
              }}
              onMouseDown={handleDown}
              onMouseMove={handleMove}
              onMouseUp={handleUp}
              onMouseLeave={handleUp}
              onTouchStart={handleDown}
              onTouchMove={handleMove}
              onTouchEnd={handleUp}
            />
            
            {/* Real-time cursors */}
            {Array.from(cursors.values()).map((cursor) => (
              <div
                key={cursor.user}
                style={{
                  position: 'absolute',
                  left: `${cursor.x}px`,
                  top: `${cursor.y}px`,
                  zIndex: 1000,
                  pointerEvents: 'none',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: cursor.color,
                  border: '2px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: cursor.color,
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {cursor.email?.split('@')[0] || `User ${cursor.user.slice(0, 4)}`}
                  </div>
                </div>
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
                  {getToolEmoji(cursor.tool)}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
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