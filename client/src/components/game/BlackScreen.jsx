export default function BlackScreen() {
    return (
        <div className="absolute inset-0 bg-black/98 flex flex-col items-center justify-center z-10">
            {/* Background glow */}
            <div className="absolute w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-float" />

            {/* Icon */}
            <div className="text-6xl mb-6 animate-float">🎯</div>

            {/* Title */}
            <h1 className="text-5xl font-black font-display gradient-text mb-4 animate-scale-in">
                RATING PHASE
            </h1>

            {/* Subtitle */}
            <p className="text-gray-500 text-lg tracking-[0.3em] uppercase animate-slide-up" style={{ animationDelay: '0.2s' }}>
                Submit your rating below
            </p>

            {/* Animated dots */}
            <div className="flex gap-2 mt-6">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
        </div>
    );
}
