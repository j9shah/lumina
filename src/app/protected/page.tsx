
"use client";
import React, { useRef, useEffect, useState } from "react";

const TOOLS = [
  { key: "brush", label: "🖌️ Brush" },
  { key: "pencil", label: "✏️ Pencil" },
  { key: "eraser", label: "🩹 Eraser" },
  { key: "bucket", label: "🪣 Bucket" },
  { key: "text", label: "🅣 Text" },
];

export default function ProtectedPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<string>("brush");
  const [color, setColor] = useState<string>("#000000");
  const [size, setSize] = useState<number>(8);
  const [textSize, setTextSize] = useState<number>(24);
  const [drawing, setDrawing] = useState<boolean>(false);
  const [lastPos, setLastPos] = useState<{x:number, y:number}|null>(null);

  // Resize canvas for hidpi
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
      function resizeCanvas() {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Drawing logic
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

  function handleDown(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const p = getPos(e);
    if (tool === "bucket") {
      if (!canvas || !ctx) return;
      // --- Bucket fill implementation ---
      const tol = 24, dpr = Math.max(1, window.devicePixelRatio || 1);
      const x0 = Math.floor(p.x*dpr), y0 = Math.floor(p.y*dpr);
      const w = Math.floor(canvas.clientWidth*dpr), h = Math.floor(canvas.clientHeight*dpr);
      const img = ctx.getImageData(0,0,w,h), data = img.data;
      const i0 = (y0*w + x0)*4, target = [data[i0],data[i0+1],data[i0+2],data[i0+3]], fillc = hex2rgba(color);
      if (same(target, fillc)) return;
      const stack=[[x0,y0]];
      while(stack.length){
        let pt=stack.pop(), x=pt[0], y=pt[1];
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
      return;
    }
    if (tool === "text") {
      const t = prompt("Enter text:");
      if (!t || !ctx) return;
      ctx.save(); ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = color; ctx.font = textSize + "px Arial, sans-serif"; ctx.textBaseline = "top";
      ctx.fillText(t, p.x, p.y); ctx.restore();
      return;
    }
    setDrawing(true);
    setLastPos(p);
    ctx?.beginPath();
    ctx?.moveTo(p.x, p.y);
    e.preventDefault();
  }

  function handleMove(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const p = getPos(e);
    if (!ctx || !lastPos) return;
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
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!drawing) return;
    setDrawing(false);
    setLastPos(null);
    ctx?.closePath();
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    <div style={{ display: "flex", minHeight: "100vh", background: "#181f2a", padding: 0 }}>
      <aside style={{ width: 260, minWidth: 220, background: "#232b3a", borderRight: "1px solid #232b3a", padding: 24, display: "flex", flexDirection: "column", gap: 24, boxShadow: "2px 0 16px 0 #0002" }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 22, color: "#fff", fontWeight: 700, letterSpacing: 1 }}>Lumina Paint</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TOOLS.map(t => (
            <button
              key={t.key}
              className={tool === t.key ? "active" : ""}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "none",
                background: tool === t.key ? "#0f172a" : "#232b3a",
                color: tool === t.key ? "#fff" : "#cbd5e1",
                fontSize: 16,
                fontWeight: 500,
                cursor: tool === t.key ? "pointer" : "pointer",
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
        </div>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, fontWeight: 500 }}>Tip: B/P/E/F/T to switch tools.</p>
      </aside>
      <main style={{ flex: 1, padding: 32, background: "#181f2a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 1200, height: "80vh", background: "#232b3a", borderRadius: 24, boxShadow: "0 4px 32px #0004", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <canvas
            ref={canvasRef}
            id="canvas"
            style={{ width: "96%", height: "96%", minHeight: 600, minWidth: 900, background: "#fff", border: "2px solid #38bdf8", borderRadius: 18, display: "block", touchAction: "none", boxShadow: "0 2px 16px #38bdf8" }}
            onMouseDown={handleDown}
            onMouseMove={handleMove}
            onMouseUp={handleUp}
            onMouseLeave={handleUp}
            onTouchStart={handleDown}
            onTouchMove={handleMove}
            onTouchEnd={handleUp}
          />
        </div>
      </main>
    </div>
  );
}
