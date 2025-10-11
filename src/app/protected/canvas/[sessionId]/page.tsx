"use client";
import React, { useRef, useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

const TOOLS = [
  { key: "brush", label: "Brush" },
  { key: "pencil", label: "Pencil" },
  { key: "eraser", label: "Eraser" },
  { key: "bucket", label: "Bucket" },
  { key: "text", label: "Text" },
];

interface DrawingEvent {
  type: 'draw' | 'erase' | 'clear' | 'text' | 'bucket' | 'textbox_create' | 'textbox_update' | 'textbox_delete' | 'undo' | 'redo';
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
  
  // Text box state
  const [textBoxes, setTextBoxes] = useState<Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    fontSize: number;
    isEditing: boolean;
    width: number;
    height: number;
  }>>([]);
  const [selectedTextBox, setSelectedTextBox] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0});
  
  // Undo/Redo state
  const [history, setHistory] = useState<Array<{
    canvasData: string;
    textBoxes: typeof textBoxes;
  }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);

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
        
        // Save initial state to history
        setTimeout(() => {
          const canvasData = canvas.toDataURL();
          setHistory([{ canvasData, textBoxes: [] }]);
          setHistoryIndex(0);
        }, 100);
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
        
      case 'bucket':
        if (event.data.pos && event.data.color) {
          // Perform bucket fill at the remote position
          const tol = 24;
          const dpr = Math.max(1, window.devicePixelRatio || 1);
          const x0 = Math.floor(event.data.pos.x * dpr), y0 = Math.floor(event.data.pos.y * dpr);
          const w = canvas.width, h = canvas.height;
          const img = ctx.getImageData(0, 0, w, h), data = img.data;
          const i0 = (y0*w + x0)*4, target = [data[i0],data[i0+1],data[i0+2],data[i0+3]], fillc = hex2rgba(event.data.color);
          if (same(target, fillc)) return;
          const stack=[[x0,y0]];
          while(stack.length){
            let pt=stack.pop();
            if (!pt) continue;
            let x=pt[0], y=pt[1];
            while(x>=0 && near(x,y)) x--; x++;
            let up=false, dn=false;
            while(x<w && near(x,y)){
              setp(x,y,fillc);
              if(y>0   && near(x,y-1)){ if(!up){stack.push([x,y-1]); up=true;} } else up=false;
              if(y<h-1 && near(x,y+1)){ if(!dn){stack.push([x,y+1]); dn=true;} } else dn=false;
              x++;
            }
          }
          ctx.putImageData(img,0,0);
          function idx(x:number,y:number){ return (y*w + x)*4; }
          function setp(x:number,y:number,c:number[]){ var i=idx(x,y); data[i]=c[0]; data[i+1]=c[1]; data[i+2]=c[2]; data[i+3]=255; }
          function near(x:number,y:number){ var i=idx(x,y); return Math.abs(data[i]-target[0])<=tol && Math.abs(data[i+1]-target[1])<=tol && Math.abs(data[i+2]-target[2])<=tol && Math.abs(data[i+3]-target[3])<=tol; }
          function same(a:number[],b:number[]){ return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]&&a[3]===255; }
          function hex2rgba(hex:string){ var v=hex.replace("#",""); return [parseInt(v.substr(0,2),16),parseInt(v.substr(2,2),16),parseInt(v.substr(4,2),16),255]; }
        }
        break;
        
      case 'textbox_create':
        if (event.data) {
          setTextBoxes(prev => [...prev, event.data]);
        }
        break;
        
      case 'textbox_update':
        if (event.data) {
          setTextBoxes(prev => prev.map(box => 
            box.id === event.data.id ? event.data : box
          ));
        }
        break;
        
      case 'textbox_delete':
        if (event.data && event.data.id) {
          setTextBoxes(prev => prev.filter(box => box.id !== event.data.id));
        }
        break;
        
      case 'undo':
        if (event.data) {
          setIsUndoRedo(true);
          // Restore canvas
          const undoImg = new Image();
          undoImg.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(undoImg, 0, 0);
            setIsUndoRedo(false);
          };
          undoImg.src = event.data.canvasData;
          // Restore text boxes
          setTextBoxes(event.data.textBoxes);
        }
        break;
        
      case 'redo':
        if (event.data) {
          setIsUndoRedo(true);
          // Restore canvas
          const redoImg = new Image();
          redoImg.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(redoImg, 0, 0);
            setIsUndoRedo(false);
          };
          redoImg.src = event.data.canvasData;
          // Restore text boxes
          setTextBoxes(event.data.textBoxes);
        }
        break;
        
      case 'clear':
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setTextBoxes([]); // Clear text boxes too
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
    
    // Deselect text box when clicking on canvas (unless in text mode)
    if (tool !== "text") {
      setSelectedTextBox(null);
    }
    
    if (tool === "bucket") {
      if (!canvas || !ctx) return;
      // Bucket fill implementation
      const tol = 24;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const x0 = Math.floor(p.x * dpr), y0 = Math.floor(p.y * dpr);
      const w = canvas.width, h = canvas.height;
      const img = ctx.getImageData(0, 0, w, h), data = img.data;
      const i0 = (y0*w + x0)*4, target = [data[i0],data[i0+1],data[i0+2],data[i0+3]], fillc = hex2rgba(color);
      if (same(target, fillc)) return;
      const stack=[[x0,y0]];
      while(stack.length){
        let pt=stack.pop();
        if (!pt) continue;
        let x=pt[0], y=pt[1];
        while(x>=0 && near(x,y)) x--; x++;
        let up=false, dn=false;
        while(x<w && near(x,y)){
          setp(x,y,fillc);
          if(y>0   && near(x,y-1)){ if(!up){stack.push([x,y-1]); up=true;} } else up=false;
          if(y<h-1 && near(x,y+1)){ if(!dn){stack.push([x,y+1]); dn=true;} } else dn=false;
          x++;
        }
      }
      ctx.putImageData(img,0,0);
      
      // Save to history after bucket fill
      setTimeout(() => saveToHistory(), 100);
      
      function idx(x:number,y:number){ return (y*w + x)*4; }
      function setp(x:number,y:number,c:number[]){ var i=idx(x,y); data[i]=c[0]; data[i+1]=c[1]; data[i+2]=c[2]; data[i+3]=255; }
      function near(x:number,y:number){ var i=idx(x,y); return Math.abs(data[i]-target[0])<=tol && Math.abs(data[i+1]-target[1])<=tol && Math.abs(data[i+2]-target[2])<=tol && Math.abs(data[i+3]-target[3])<=tol; }
      function same(a:number[],b:number[]){ return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]&&a[3]===255; }
      function hex2rgba(hex:string){ var v=hex.replace("#",""); return [parseInt(v.substr(0,2),16),parseInt(v.substr(2,2),16),parseInt(v.substr(4,2),16),255]; }
      
      // Broadcast bucket fill event
      if (channel && currentUser) {
        channel.send({
          type: 'broadcast',
          event: 'drawing',
          payload: {
            type: 'bucket',
            data: { pos: p, color },
            user: currentUser.id,
            timestamp: Date.now()
          }
        });
      }
      return;
    }
    
    if (tool === "text") {
      // Create a new text box instead of drawing directly
      const newTextBox = {
        id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        x: p.x,
        y: p.y,
        text: "Click to edit text",
        color: color,
        fontSize: textSize,
        isEditing: true,
        width: 200,
        height: textSize + 10
      };
      
      setTextBoxes(prev => [...prev, newTextBox]);
      setSelectedTextBox(newTextBox.id);
      
      // Save to history after text box creation
      setTimeout(() => saveToHistory(), 100);
      
      // Broadcast text box creation event
      if (channel && currentUser) {
        channel.send({
          type: 'broadcast',
          event: 'drawing',
          payload: {
            type: 'textbox_create',
            data: newTextBox,
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
    
    // Save to history after drawing
    setTimeout(() => saveToHistory(), 100);
    
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
    
    // Clear text boxes
    setTextBoxes([]);
    setSelectedTextBox(null);
    
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

  function handleSavePDF(name: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a new canvas with white background for PDF
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Fill with white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the original canvas on top
    tempCtx.drawImage(canvas, 0, 0);
    
    // Convert to data URL and download
    const url = tempCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }

  // Text box functions
  const updateTextBox = (id: string, updates: Partial<typeof textBoxes[0]>) => {
    setTextBoxes(prev => prev.map(box => 
      box.id === id ? { ...box, ...updates } : box
    ));
    
    // Broadcast text box update
    if (channel && currentUser) {
      const updatedBox = textBoxes.find(box => box.id === id);
      if (updatedBox) {
        const newBox = { ...updatedBox, ...updates };
        channel.send({
          type: 'broadcast',
          event: 'drawing',
          payload: {
            type: 'textbox_update',
            data: newBox,
            user: currentUser.id,
            timestamp: Date.now()
          }
        });
      }
    }
  };

  const deleteTextBox = (id: string) => {
    setTextBoxes(prev => prev.filter(box => box.id !== id));
    setSelectedTextBox(null);
    
    // Broadcast text box deletion
    if (channel && currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'drawing',
        payload: {
          type: 'textbox_delete',
          data: { id },
          user: currentUser.id,
          timestamp: Date.now()
        }
      });
    }
  };

  const handleTextBoxMouseDown = (e: React.MouseEvent, boxId: string) => {
    e.stopPropagation();
    setSelectedTextBox(boxId);
    setIsDragging(true);
    
    const box = textBoxes.find(b => b.id === boxId);
    if (box) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleTextBoxMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedTextBox) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const canvasRect = canvas.getBoundingClientRect();
      const newX = e.clientX - canvasRect.left - dragOffset.x;
      const newY = e.clientY - canvasRect.top - dragOffset.y;
      
      updateTextBox(selectedTextBox, { x: newX, y: newY });
    }
  };

  const handleTextBoxMouseUp = () => {
    setIsDragging(false);
  };

  // Undo/Redo functions
  const saveToHistory = () => {
    if (isUndoRedo) return; // Don't save during undo/redo operations
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasData = canvas.toDataURL();
    const newState = {
      canvasData,
      textBoxes: [...textBoxes]
    };
    
    // Remove any history after current index (when we're in the middle of history)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // Limit history to last 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(prev => prev + 1);
    }
    
    setHistory(newHistory);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    
    setIsUndoRedo(true);
    const prevState = history[historyIndex - 1];
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    
    // Restore canvas
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setIsUndoRedo(false);
    };
    img.src = prevState.canvasData;
    
    // Restore text boxes
    setTextBoxes(prevState.textBoxes);
    setHistoryIndex(prev => prev - 1);
    
    // Broadcast undo to collaborators
    if (channel && currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'drawing',
        payload: {
          type: 'undo',
          data: { canvasData: prevState.canvasData, textBoxes: prevState.textBoxes },
          user: currentUser.id,
          timestamp: Date.now()
        }
      });
    }
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    
    setIsUndoRedo(true);
    const nextState = history[historyIndex + 1];
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    
    // Restore canvas
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setIsUndoRedo(false);
    };
    img.src = nextState.canvasData;
    
    // Restore text boxes
    setTextBoxes(nextState.textBoxes);
    setHistoryIndex(prev => prev + 1);
    
    // Broadcast redo to collaborators
    if (channel && currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'drawing',
        payload: {
          type: 'redo',
          data: { canvasData: nextState.canvasData, textBoxes: nextState.textBoxes },
          user: currentUser.id,
          timestamp: Date.now()
        }
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Prevent shortcuts when typing in text boxes
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }
      
      const k = e.key.toLowerCase();
      
      // Tool shortcuts
      if (k === "1") setTool("brush");
      else if (k === "2") setTool("pencil");
      else if (k === "3") setTool("eraser");
      else if (k === "4") setTool("bucket");
      else if (k === "5") setTool("text");
      
      // Undo/Redo shortcuts
      else if ((e.ctrlKey || e.metaKey) && k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      else if ((e.ctrlKey || e.metaKey) && (k === "y" || (k === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [historyIndex, history]);

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
              Share Session
            </button>
            
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                style={{ 
                  background: historyIndex > 0 ? "#6366f1" : "#4a5568", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: 8, 
                  padding: "8px 12px", 
                  fontSize: 14, 
                  fontWeight: 600, 
                  cursor: historyIndex > 0 ? "pointer" : "not-allowed", 
                  flex: 1,
                  boxShadow: "0 2px 4px #0002" 
                }}
                onClick={undo}
                disabled={historyIndex <= 0}
                title="Undo (Ctrl+Z)"
              >
                Undo
              </button>
              <button
                style={{ 
                  background: historyIndex < history.length - 1 ? "#6366f1" : "#4a5568", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: 8, 
                  padding: "8px 12px", 
                  fontSize: 14, 
                  fontWeight: 600, 
                  cursor: historyIndex < history.length - 1 ? "pointer" : "not-allowed", 
                  flex: 1,
                  boxShadow: "0 2px 4px #0002" 
                }}
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title="Redo (Ctrl+Y)"
              >
                Redo
              </button>
            </div>
            
            <button
              style={{ background: "#232b3a", color: "#fff", border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 16, fontWeight: 500, cursor: "pointer", marginBottom: 4, boxShadow: "0 2px 8px #0002" }}
              onClick={handleClear}
            >Clear</button>
            <button
              style={{ background: "#38bdf8", color: "#181f2a", border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 4, boxShadow: "0 2px 8px #38bdf8" }}
              onClick={() => handleSave("image/png", "artwork.png")}
            >Save PNG</button>
            <button
              style={{ background: "#38bdf8", color: "#181f2a", border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 4, boxShadow: "0 2px 8px #38bdf8" }}
              onClick={() => handleSave("image/jpeg", "artwork.jpg")}
            >Save JPEG</button>
            <button
              style={{ background: "#9333ea", color: "#fff", border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 4, boxShadow: "0 2px 8px #9333ea" }}
              onClick={() => handleSavePDF("artwork.pdf")}
            >Save PDF</button>
          </div>
          
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, fontWeight: 500 }}>
            Tips: 1-5 for tools • Ctrl+Z/Y for undo/redo
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
              onMouseMove={(e) => {
                handleTextBoxMouseMove(e);
                handleMove(e);
              }}
              onMouseUp={() => {
                handleTextBoxMouseUp();
                handleUp();
              }}
              onMouseLeave={() => {
                handleTextBoxMouseUp();
                handleUp();
              }}
              onTouchStart={handleDown}
              onTouchMove={handleMove}
              onTouchEnd={handleUp}
            />
            
            {/* Interactive Text Boxes */}
            {textBoxes.map((textBox) => (
              <div
                key={textBox.id}
                style={{
                  position: 'absolute',
                  left: `${textBox.x}px`,
                  top: `${textBox.y}px`,
                  width: `${textBox.width}px`,
                  minHeight: `${textBox.height}px`,
                  zIndex: 1001,
                  cursor: isDragging && selectedTextBox === textBox.id ? 'grabbing' : 'grab',
                  border: selectedTextBox === textBox.id ? '2px dashed #38bdf8' : '2px solid transparent',
                  borderRadius: '4px',
                  background: selectedTextBox === textBox.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                  padding: '4px'
                }}
                onMouseDown={(e) => handleTextBoxMouseDown(e, textBox.id)}
              >
                {textBox.isEditing ? (
                  <textarea
                    value={textBox.text}
                    onChange={(e) => updateTextBox(textBox.id, { text: e.target.value })}
                    onBlur={() => updateTextBox(textBox.id, { isEditing: false })}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        updateTextBox(textBox.id, { isEditing: false });
                      }
                    }}
                    autoFocus
                    style={{
                      width: '100%',
                      minHeight: `${textBox.height}px`,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: `${textBox.fontSize}px`,
                      color: textBox.color,
                      fontFamily: 'Arial, sans-serif',
                      resize: 'both',
                      overflow: 'hidden'
                    }}
                  />
                ) : (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTextBox(textBox.id, { isEditing: true });
                    }}
                    style={{
                      fontSize: `${textBox.fontSize}px`,
                      color: textBox.color,
                      fontFamily: 'Arial, sans-serif',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      minHeight: `${textBox.height}px`,
                      cursor: 'text'
                    }}
                  >
                    {textBox.text}
                  </div>
                )}
                
                {/* Text box controls */}
                {selectedTextBox === textBox.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#ff4444',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#fff',
                      cursor: 'pointer',
                      border: '2px solid #fff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTextBox(textBox.id);
                    }}
                  >
                    ×
                  </div>
                )}
              </div>
            ))}
            
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
    case 'brush': return 'B';
    case 'pencil': return 'P';
    case 'eraser': return 'E';
    case 'bucket': return 'F';
    case 'text': return 'T';
    default: return 'B';
  }
}