import { useState } from 'react';

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export default function Lobby({ socket, onJoin }) {
    const [username, setUsername] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const createRoom = () => {
        if (!username.trim()) return setError('Please enter a username');
        if (isMobile) return setError('⚠️ Host must be on a laptop/PC — screen sharing is not supported on mobile browsers. Join a game instead!');
        setLoading(true);
        socket.emit('create-room', { username: username.trim() }, (response) => {
            setLoading(false);
            if (response.success) {
                onJoin({
                    roomCode: response.roomCode,
                    username: username.trim(),
                    role: 'host',
                    players: [{ id: socket.id, username: username.trim(), role: 'host' }]
                });
            }
        });
    };

    const joinRoom = () => {
        if (!username.trim() || !roomCode.trim()) return setError('Please enter username and room code');
        setLoading(true);
        socket.emit('join-room', { roomCode: roomCode.toUpperCase().trim(), username: username.trim() }, (response) => {
            setLoading(false);
            if (response.success) {
                onJoin({
                    roomCode: response.roomCode,
                    username: username.trim(),
                    role: 'player',
                    players: []
                });
            } else {
                setError(response.message);
            }
        });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-grid bg-radial-glow relative">
            {/* Decorative Background Orbs */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" style={{ animationDelay: '1.5s' }} />

            {/* Logo */}
            <div className="mb-12 text-center animate-slide-up">
                <div className="text-6xl mb-3">🎯</div>
                <h1 className="text-5xl font-black font-display gradient-text mb-2">
                    Outlier
                </h1>
                <p className="text-gray-500 text-sm tracking-[0.3em] uppercase">
                    Rate · Compare · Find the Outlier
                </p>
            </div>

            {/* Main Card */}
            <div className="glass-strong rounded-2xl p-8 w-full max-w-md animate-scale-in shadow-2xl shadow-indigo-950/30">
                {error && (
                    <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-center text-sm animate-slide-up">
                        ⚠️ {error}
                    </div>
                )}

                {/* Username Input */}
                <div className="mb-6">
                    <label className="block text-gray-400 mb-2 text-xs tracking-wider uppercase font-medium">Your Name</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); setError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && createRoom()}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-lg focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all duration-300 placeholder:text-gray-600"
                        placeholder="Enter your nickname..."
                        maxLength={15}
                    />
                </div>

                {/* Create Room */}
                <button
                    onClick={createRoom}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-900/40 hover:shadow-indigo-800/60 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 text-lg"
                >
                    {loading ? '...' : '✨ Create New Game'}
                </button>

                {/* Divider */}
                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-white/10" />
                    <span className="flex-shrink-0 mx-4 text-gray-600 text-xs tracking-[0.2em] uppercase">or join</span>
                    <div className="flex-grow border-t border-white/10" />
                </div>

                {/* Join Room */}
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={roomCode}
                        onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xl focus:outline-none focus:border-emerald-500/50 uppercase tracking-[0.4em] text-center font-mono font-bold placeholder:text-gray-600 placeholder:tracking-normal placeholder:font-normal placeholder:text-base"
                        placeholder="CODE"
                        maxLength={4}
                    />
                    <button
                        onClick={joinRoom}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-900/40 hover:shadow-emerald-800/60 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                    >
                        Join →
                    </button>
                </div>
            </div>

            {/* Footer */}
            <p className="mt-8 text-gray-700 text-xs">
                Share screens · Rate content · Find the outlier
            </p>
        </div>
    );
}
