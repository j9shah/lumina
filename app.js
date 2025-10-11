// ==== elements ====
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d", { willReadFrequently: true });

var toolBtns = document.querySelectorAll(".tool-btn");
var colorWheel = document.getElementById("colorWheel");
var sizeWrap = document.getElementById("sizeWrap");
var sizeRange = document.getElementById("sizeRange");
var sizeValue = document.getElementById("sizeValue");
var textSizeWrap = document.getElementById("textSizeWrap");
var textSizeRange = document.getElementById("textSizeRange");
var textSizeValue = document.getElementById("textSizeValue");
var clearBtn = document.getElementById("clearBtn");
var savePngBtn = document.getElementById("savePngBtn");
var saveJpegBtn = document.getElementById("saveJpegBtn");
var themeToggle = document.getElementById("themeToggle");

// ==== canvas sizing (hidpi) ====
function resizeCanvas() {
  var dpr = Math.max(1, window.devicePixelRatio || 1);
  var w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!resizeCanvas.did) {
    // fill white bg once
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    resizeCanvas.did = true;
  }
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ==== state ====
var tool = "brush";      // brush | pencil | eraser | bucket | text
var color = "#000000";
var size = 8;            // brush/pencil/eraser size
var textSize = 24;
var drawing = false, lastX = 0, lastY = 0;

// ==== tools (highlight + cursor) ====
// attach clicks
for (var i = 0; i < toolBtns.length; i++) {
  toolBtns[i].addEventListener("click", function () { setTool(this.dataset.tool); });
}
setTool("brush");

function setTool(next) {
  tool = next;
  // toggle active class
  for (var i = 0; i < toolBtns.length; i++) {
    var same = toolBtns[i].dataset.tool === tool;
    if (same) toolBtns[i].classList.add("active"); else toolBtns[i].classList.remove("active");
  }

  // panels show/hide
  if (textSizeWrap) textSizeWrap.classList.toggle("hidden", tool !== "text");
  if (sizeWrap) sizeWrap.classList.toggle("hidden", tool === "text");

  // svg cursor data (no extra quotes)
  var url = null;
  if (tool === "brush") url = svg("<circle cx='9' cy='19' r='6' fill='black'/><path d='M22 6l-9 9' stroke='black' stroke-width='3'/>");
  else if (tool === "pencil") url = svg("<path d='M6 22l4-1 9-9-3-3-9 9-1 4z' fill='black'/>");
  else if (tool === "eraser") url = svg("<rect x='5' y='12' width='16' height='10' rx='3' ry='3' fill='#ff5ca8' stroke='black' stroke-width='1'/>");
  else if (tool === "bucket") url = svg("<path d='M6 12l8-8 8 8-8 8-8-8z' fill='black'/><rect x='4' y='25' width='20' height='2' fill='black'/>");

  // set cursor (text uses native)
  canvas.style.cursor = (tool === "text") ? "text" : (url ? "url(" + url + ") 8 24, crosshair" : "crosshair");
}
function svg(inner) {
  return "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'>" + inner + "</svg>");
}

// ==== controls ====
// wire inputs (guard if missing)
if (colorWheel) colorWheel.addEventListener("input", function(){ color = this.value; });
if (sizeRange) sizeRange.addEventListener("input", function(){ size = +this.value; if (sizeValue) sizeValue.textContent = String(size); });
if (textSizeRange) textSizeRange.addEventListener("input", function(){ textSize = +this.value; if (textSizeValue) textSizeValue.textContent = String(textSize); });

// ==== pointer helpers ====
function pos(e) {
  var r = canvas.getBoundingClientRect();
  var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  var y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
  return { x:x, y:y };
}

// ==== drawing ====
function down(e) {
  var p = pos(e);
  if (tool === "bucket") { fill(p.x, p.y, color); return; }
  if (tool === "text") {
    var t = prompt("Enter text:"); if (!t) return;
    ctx.save(); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = color; ctx.font = textSize + "px Arial, sans-serif"; ctx.textBaseline = "top";
    ctx.fillText(t, p.x, p.y); ctx.restore(); return;
  }
  drawing = true; lastX = p.x; lastY = p.y; ctx.beginPath(); ctx.moveTo(lastX, lastY); e.preventDefault();
}
function move(e) {
  if (!drawing) return;
  var p = pos(e);
  if (tool === "eraser") { ctx.globalCompositeOperation = "destination-out"; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.lineWidth=size; }
  else if (tool === "brush") { ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle=color; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.lineWidth=size; }
  else if (tool === "pencil") { ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle=color; ctx.lineCap="butt"; ctx.lineJoin="miter"; ctx.lineWidth=Math.max(1,size/2); }
  ctx.lineTo(p.x, p.y); ctx.stroke(); lastX=p.x; lastY=p.y; e.preventDefault();
}
function up(){ if (!drawing) return; drawing = false; ctx.closePath(); }

canvas.addEventListener("mousedown", down);
canvas.addEventListener("mousemove", move);
canvas.addEventListener("mouseup",   up);
canvas.addEventListener("mouseleave",up);
canvas.addEventListener("touchstart",down, {passive:false});
canvas.addEventListener("touchmove", move, {passive:false});
canvas.addEventListener("touchend",  up);

// ==== bucket fill (scanline) ====
function fill(sx, sy, hex) {
  var tol = 24, dpr = Math.max(1, window.devicePixelRatio || 1);
  var x0 = Math.floor(sx*dpr), y0 = Math.floor(sy*dpr);
  var w = Math.floor(canvas.clientWidth*dpr), h = Math.floor(canvas.clientHeight*dpr);
  var img = ctx.getImageData(0,0,w,h), data = img.data;
  var i0 = (y0*w + x0)*4, target = [data[i0],data[i0+1],data[i0+2],data[i0+3]], fillc = hex2rgba(hex);
  if (same(target, fillc)) return;
  var stack=[[x0,y0]];
  while(stack.length){
    var p=stack.pop(), x=p[0], y=p[1];
    while(x>=0 && near(x,y)) x--; x++;
    var up=false, dn=false;
    while(x<w && near(x,y)){
      setp(x,y,fillc);
      if(y>0   && near(x,y-1)){ if(!up){stack.push([x,y-1]); up=true;} } else up=false;
      if(y<h-1 && near(x,y+1)){ if(!dn){stack.push([x,y+1]); dn=true;} } else dn=false;
      x++;
    }
  }
  ctx.putImageData(img,0,0);
  function idx(x,y){ return (y*w + x)*4; }
  function setp(x,y,c){ var i=idx(x,y); data[i]=c[0]; data[i+1]=c[1]; data[i+2]=c[2]; data[i+3]=255; }
  function near(x,y){ var i=idx(x,y); return Math.abs(data[i]-target[0])<=tol && Math.abs(data[i+1]-target[1])<=tol && Math.abs(data[i+2]-target[2])<=tol && Math.abs(data[i+3]-target[3])<=tol; }
  function same(a,b){ return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]&&a[3]===255; }
}
function hex2rgba(hex){ var v=hex.replace("#",""); return [parseInt(v.substr(0,2),16),parseInt(v.substr(2,2),16),parseInt(v.substr(4,2),16),255]; }

// ==== clear & save ====
clearBtn.addEventListener("click", function(){
  var w=canvas.clientWidth, h=canvas.clientHeight;
  ctx.clearRect(0,0,w,h); ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,w,h);
});
savePngBtn.addEventListener("click", function(){ download(exportWhite("image/png"), "artwork.png"); });
saveJpegBtn.addEventListener("click", function(){ download(exportWhite("image/jpeg"), "artwork.jpg"); });

function exportWhite(mime){
  var dpr=Math.max(1,window.devicePixelRatio||1), w=Math.floor(canvas.clientWidth*dpr), h=Math.floor(canvas.clientHeight*dpr);
  var tmp=document.createElement("canvas"); tmp.width=w; tmp.height=h; var t=tmp.getContext("2d");
  t.fillStyle="#ffffff"; t.fillRect(0,0,w,h); t.drawImage(canvas,0,0,w,h); return tmp.toDataURL(mime);
}
function download(url,name){ var a=document.createElement("a"); a.href=url; a.download=name; a.click(); }

// ==== theme toggle (guarded) ====
if (themeToggle) {
  (function initTheme(){
    var saved = localStorage.getItem("theme");
    if (saved === "dark") document.body.classList.add("dark");
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  })();
  themeToggle.addEventListener("click", function(){
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });
}

// ==== shortcuts ====
window.addEventListener("keydown", function(e){
  var k=e.key.toLowerCase();
  if(k==="b") setTool("brush");
  else if(k==="p") setTool("pencil");
  else if(k==="e") setTool("eraser");
  else if(k==="f") setTool("bucket");
  else if(k==="t") setTool("text");
});