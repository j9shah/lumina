"use client"
export default function Home() {
  return (
    <main className="min-h-screen bg-[#181f2a] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated Painting Emojis Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <span className="absolute top-10 left-10 text-[5rem] opacity-10 animate-bounce-slow">🎨</span>
        <span className="absolute top-1/2 left-1/4 text-[4rem] opacity-10 animate-bounce-medium">🖌️</span>
        <span className="absolute bottom-20 right-20 text-[6rem] opacity-10 animate-bounce-fast">🖼️</span>
        <span className="absolute bottom-1/3 left-2/3 text-[3.5rem] opacity-10 animate-bounce-slow">🎨</span>
        <span className="absolute top-1/4 right-1/4 text-[4.5rem] opacity-10 animate-bounce-medium">🖌️</span>
      </div>

      {/* Header */}
      <nav className="w-full flex justify-center h-20 mb-8 z-10">
        <div className="flex items-center gap-3 text-2xl font-bold text-white">
          <span className="text-3xl">🎨</span>
          Lumina Paint
        </div>
      </nav>

      {/* Main Content */}
      <section className="flex flex-col items-center gap-8 z-10">
        <h1 className="text-4xl font-extrabold text-green-400 text-center">
          Unleash Your Creativity<br />with Lumina Paint
        </h1>
        <p className="text-lg text-gray-300 text-center max-w-xl">
          Start painting, sketching, and expressing yourself. Simple, fun, and vibrant—just like MS Paint!
        </p>

        {/* Paint Activity Input (no checkbox) */}
        <div className="flex flex-col items-start gap-2 relative">
          <label className="text-white text-lg font-semibold mb-2">Draw something...</label>
          <div className="flex items-center bg-[#232b3a] rounded-xl px-6 py-4 min-w-[320px] shadow-lg">
            <span className="text-white font-medium ml-8">Let Your Creativity Run Wild!</span>
          </div>
        </div>

        {/* Paint Color Swatches */}
        <div className="flex gap-2 mt-4">
          <span className="text-2xl">🟥</span>
          <span className="text-2xl">🟧</span>
          <span className="text-2xl">🟨</span>
          <span className="text-2xl">🟩</span>
          <span className="text-2xl">🟦</span>
          <span className="text-2xl">🟪</span>
        </div>

        {/* Call to Action */}
        <a href="/auth/login" className="mt-8 px-8 py-3 bg-green-400 text-[#181f2a] font-bold rounded-full shadow hover:bg-green-300 transition text-center">
          Start Painting
        </a>
      </section>

      {/* Footer */}
      <footer className="w-full flex flex-col items-center justify-center mt-16 py-8 border-t border-t-[#232b3a] text-gray-400 text-sm gap-4 z-10">
        <p>© 2025 Lumina Paint. All rights reserved.</p>
      </footer>

      {/* Simple bouncing animation styles */}
      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
        @keyframes bounce-medium {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-50px); }
        }
        @keyframes bounce-fast {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-70px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
        .animate-bounce-medium {
          animation: bounce-medium 2s infinite;
        }
        .animate-bounce-fast {
          animation: bounce-fast 1.5s infinite;
        }
      `}</style>
    </main>
  );
}
