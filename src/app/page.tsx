"use client";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0d0d0d] flex flex-col relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f0f] z-0" />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      
      {/* Floating Geometric Shapes */}
      <div className="absolute top-20 right-[15%] w-64 h-64 bg-purple-500/10 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-32 left-[10%] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl z-0" />

      {/* Header */}
      <nav className="flex-shrink-0 w-full flex justify-between items-center px-4 md:px-8 h-16 z-20 border-b border-white/5">
        <div className="flex items-center gap-2 text-base md:text-lg font-semibold text-white">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg" />
          Lumina
        </div>
        <a href="/auth/login" className="text-xs md:text-sm text-gray-400 hover:text-white transition">
          Sign in
        </a>
      </nav>

      {/* Main Content */}
      <section className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6 z-10 max-w-5xl w-full mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 mb-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Real-time collaboration
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center leading-tight max-w-4xl">
          Collaborative canvas<br className="hidden sm:block" />
          <span className="sm:hidden"> </span>for creative teams
        </h1>
        
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-400 text-center max-w-2xl px-4">
          Draw together in real-time. Share a link, invite your team, and start creating instantly.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 md:mt-6 w-full sm:w-auto">
          <a href="/auth/sign-up" 
             className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition shadow-lg text-center">
            Get started
          </a>
          <a href="/auth/login" 
             className="px-6 py-3 bg-white/5 text-white font-medium rounded-lg hover:bg-white/10 transition border border-white/10 text-center">
            Sign in
          </a>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8 md:mt-16 w-full">
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Draw anything</h3>
            <p className="text-sm text-gray-500">Brush, shapes, fill—everything you need</p>
          </div>

          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Live cursors</h3>
            <p className="text-sm text-gray-500">See everyone's cursor in real-time</p>
          </div>

          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Instant share</h3>
            <p className="text-sm text-gray-500">One link, unlimited collaborators</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex-shrink-0 w-full flex justify-center py-4 md:py-6 border-t border-white/5 z-20">
        <p className="text-xs text-gray-600">© 2025 Lumina Paint</p>
      </footer>
    </main>
  );
}
