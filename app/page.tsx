import RecordingSession from './components/RecordingSession';

export default function Home() {
  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      {/* Floating geometric elements */}
      <div className="absolute top-20 left-10 w-32 h-32 glass-subtle rounded-full float opacity-20"></div>
      <div className="absolute top-40 right-20 w-24 h-24 glass-subtle rounded-lg float" style={{animationDelay: '2s'}}></div>
      <div className="absolute bottom-40 left-1/4 w-16 h-16 glass-subtle rounded-full float" style={{animationDelay: '4s'}}></div>
      
      {/* Compact Title Overlay */}
      <div className="absolute top-6 left-6 z-20">
        <div className="bg-black/50 backdrop-blur-xl rounded-2xl p-4 border border-white/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                DrystAI
              </h1>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full pulse-glow"></div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-200">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Overlay */}
      <div className="absolute top-6 right-6 z-20">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
          <div className="flex items-center gap-2 text-xs text-gray-200">
            <kbd className="px-2 py-1 bg-white/10 rounded border border-white/30 font-mono text-xs">Space</kbd>
            <span>to record</span>
          </div>
        </div>
      </div>

      {/* Main Content - Camera Feed Takes Most Space */}
      <main className="relative z-10 h-screen">
        <RecordingSession />
      </main>
    </div>
  );
}
