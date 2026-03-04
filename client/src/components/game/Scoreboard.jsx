import React from 'react';

export default function Scoreboard({ results, onNextRound, isHost }) {
    if (!results) return null;

    return (
        <div className="absolute inset-0 bg-black/97 flex flex-col items-center justify-center z-50 p-6 bg-radial-glow">
            {/* Header */}
            <h2 className="text-sm uppercase tracking-[0.4em] text-gray-500 mb-1 animate-slide-up font-medium">
                Round Complete
            </h2>
            <div className="text-5xl font-black font-display gradient-text mb-8 animate-scale-in">
                AVG: {results.average}
            </div>

            {/* Outlier Card */}
            <div className="glass-strong rounded-2xl p-8 w-full max-w-sm mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-gray-500 text-xs uppercase tracking-[0.3em] mb-5 text-center font-medium">
                    The Outlier
                </h3>
                {results.outlier ? (
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center text-3xl font-black shadow-xl shadow-red-600/30 mb-3 animate-float">
                            {results.outlier.username[0].toUpperCase()}
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">{results.outlier.username}</div>
                        <div className="text-lg text-red-400 font-mono font-bold">Rated: {results.outlier.rating}</div>
                        <div className="text-xs text-gray-600 mt-1">Deviation: ±{results.maxDiff}</div>
                    </div>
                ) : (
                    <div className="text-center text-gray-400">Perfect consensus! 🎉</div>
                )}
            </div>

            {/* All Ratings */}
            <div className="flex gap-2 mb-8 flex-wrap justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                {results.allRatings.map((p, i) => (
                    <div
                        key={p.id}
                        className={`flex flex-col items-center p-3 rounded-xl min-w-[65px] transition-all ${p.id === results.outlier?.id
                                ? 'glass-strong border-red-500/30 bg-red-500/10'
                                : 'glass'
                            }`}
                    >
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{p.username}</span>
                        <span className="font-bold text-xl font-mono">{p.rating}</span>
                    </div>
                ))}
            </div>

            {/* Actions */}
            {isHost ? (
                <button
                    onClick={onNextRound}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-10 rounded-xl text-lg shadow-xl shadow-indigo-900/40 hover:shadow-indigo-800/60 transition-all duration-300 hover:-translate-y-0.5 animate-slide-up"
                    style={{ animationDelay: '0.3s' }}
                >
                    Next Round →
                </button>
            ) : (
                <div className="flex gap-1.5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
            )}
            {!isHost && <p className="text-gray-600 text-xs mt-2">Waiting for host...</p>}
        </div>
    );
}
