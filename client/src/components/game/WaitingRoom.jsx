import React from 'react';

export default function WaitingRoom({ socket, roomCode, players, myUsername }) {
    const host = players.find(p => p.role === 'host');

    return (
        <div className="min-h-screen flex flex-col items-center p-8 bg-grid bg-radial-glow relative">
            {/* Background Orbs */}
            <div className="absolute top-10 right-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl" />

            <div className="w-full max-w-2xl relative z-10">
                {/* Room Code Card */}
                <div className="glass-strong rounded-2xl p-8 mb-8 flex justify-between items-center animate-slide-up">
                    <div>
                        <h2 className="text-gray-500 text-xs uppercase tracking-[0.3em] font-medium mb-2">Room Code</h2>
                        <p className="text-5xl font-mono font-black gradient-text tracking-[0.3em]">{roomCode}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-gray-500 text-xs uppercase tracking-[0.3em] font-medium mb-2">Host</h2>
                        <p className="text-xl font-bold text-white">{host?.username || 'Waiting...'}</p>
                    </div>
                </div>

                {/* Player Count */}
                <h3 className="text-2xl font-bold mb-5 flex items-center gap-3 font-display animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    Players
                    <span className="bg-indigo-600/20 text-indigo-400 text-sm px-3 py-1 rounded-full border border-indigo-500/20 font-mono">
                        {players.length}
                    </span>
                </h3>

                {/* Player Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {players.map((player, i) => (
                        <div
                            key={player.id}
                            className={`glass rounded-xl p-4 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 animate-slide-up ${player.username === myUsername
                                    ? 'border-indigo-500/30 bg-indigo-500/10'
                                    : ''
                                }`}
                            style={{ animationDelay: `${0.15 + i * 0.05}s` }}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg ${player.role === 'host'
                                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                                        : 'bg-gradient-to-br from-gray-600 to-gray-700 text-gray-300'
                                    }`}>
                                    {player.username[0].toUpperCase()}
                                </div>
                                <span className="font-medium text-lg">{player.username}</span>
                            </div>
                            {player.role === 'host' && (
                                <span className="text-xs font-bold bg-amber-500/15 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                    👑 HOST
                                </span>
                            )}
                            {player.username === myUsername && player.role !== 'host' && (
                                <span className="text-xs font-medium text-indigo-400">YOU</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Waiting Animation / Start Button */}
                {host?.username === myUsername ? (
                    <div className="mt-12 flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        <button
                            onClick={() => socket.emit('start-game', { roomCode })}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xl font-bold py-5 px-16 rounded-2xl shadow-xl shadow-emerald-900/40 hover:shadow-emerald-800/60 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300"
                        >
                            🚀 Start Game
                        </button>
                        <p className="text-gray-600 text-xs mt-3">
                            {players.length < 2 ? 'Waiting for players to join...' : `${players.length} players ready!`}
                        </p>
                    </div>
                ) : (
                    <div className="mt-12 flex flex-col items-center gap-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                            <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </div>
                        <p className="text-gray-500 text-sm">Waiting for host to start...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
