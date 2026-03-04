import React, { useMemo } from 'react';

const CHALLENGES = [
    { emoji: "💪", text: "Do 10 pushups right now" },
    { emoji: "🎤", text: "Sing a song of the group's choice" },
    { emoji: "📱", text: "Send a vaguely threatening text to your mom" },
    { emoji: "🌶️", text: "Eat a spoonful of hot sauce" },
    { emoji: "🎭", text: "Give a dramatic speech about why you're the outlier" },
    { emoji: "💬", text: "Let the group text anyone in your contacts" },
    { emoji: "🐔", text: "Do your best chicken impression for 30 seconds" },
    { emoji: "🤳", text: "Post an embarrassing selfie to your story" },
];

export default function GameOver({ stats, onRestart, isHost }) {
    const loser = stats?.loser;
    const challenge = useMemo(() => CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)], []);

    if (!loser) return null;

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 p-8 text-center overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-red-950 via-black to-black" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-600/15 rounded-full blur-3xl" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Title */}
                <h1 className="text-6xl font-black font-display text-white mb-2 animate-scale-in">
                    GAME OVER
                </h1>
                <p className="text-red-400/60 text-xs uppercase tracking-[0.4em] mb-10 animate-slide-up">
                    The verdict is in
                </p>

                {/* Loser Card */}
                <div className="mb-10 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                    <p className="text-gray-500 text-xs uppercase tracking-[0.3em] mb-4">The Ultimate Outlier</p>
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center text-4xl font-black shadow-2xl shadow-red-600/40 mb-4 animate-float">
                        {loser.username[0].toUpperCase()}
                    </div>
                    <div className="text-4xl font-black gradient-text-gold mb-1">{loser.username}</div>
                    <div className="text-red-400 text-sm font-mono">
                        Outlier {loser.outlierCount}/{stats.totalRounds} rounds
                    </div>
                </div>

                {/* Challenge Card */}
                <div className="glass-strong rounded-2xl p-8 max-w-lg transform rotate-1 hover:rotate-0 transition-all duration-500 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <h3 className="text-gray-500 text-xs uppercase tracking-[0.3em] mb-4 font-medium">
                        Your Punishment
                    </h3>
                    <div className="text-5xl mb-4">{challenge.emoji}</div>
                    <p className="text-2xl font-bold text-white leading-relaxed">
                        {challenge.text}
                    </p>
                </div>

                {/* Restart */}
                {isHost && (
                    <button
                        onClick={onRestart}
                        className="mt-10 glass hover:bg-white/10 text-white font-bold py-4 px-10 rounded-xl text-lg transition-all duration-300 hover:-translate-y-0.5 animate-slide-up"
                        style={{ animationDelay: '0.45s' }}
                    >
                        🔄 Play Again
                    </button>
                )}
            </div>
        </div>
    );
}
