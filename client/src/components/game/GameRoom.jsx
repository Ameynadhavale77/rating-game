import { useEffect, useRef, useState } from 'react';
import BlackScreen from './BlackScreen';
import RatingControls from './RatingControls';
import Scoreboard from './Scoreboard';
import GameOver from './GameOver';

// ICE servers will be fetched at runtime
let rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Fetch TURN servers from our server
async function fetchTurnServers() {
    try {
        const resp = await fetch('/api/turn-credentials');
        const data = await resp.json();
        if (data.iceServers) {
            rtcConfig = { iceServers: data.iceServers };
            console.log('TURN servers loaded:', data.iceServers.length);
        }
    } catch (e) {
        console.warn('Failed to fetch TURN servers, using STUN only:', e);
    }
}

export default function GameRoom({ socket, roomCode, username, role }) {
    const [status, setStatus] = useState('Initializing...');
    const [roundState, setRoundState] = useState('sharing');
    const [hasRated, setHasRated] = useState(false);
    const [roundResults, setRoundResults] = useState(null);
    const [gameStats, setGameStats] = useState(null);
    const [roundNumber, setRoundNumber] = useState(1);
    const [hasStream, setHasStream] = useState(false);
    const [playerConnected, setPlayerConnected] = useState(false);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const streamRef = useRef(null);
    const peers = useRef({});
    const pendingRequests = useRef([]);
    const retryInterval = useRef(null);

    // ============================================================
    // SETUP: Socket listeners
    // ============================================================
    useEffect(() => {
        // --- SHARED LISTENERS ---
        socket.on('ice-candidate', handleReceiveCandidate);

        socket.on('round-results', (results) => {
            setRoundResults(results);
            setRoundState('results');
            setStatus('Round Completed!');
        });

        socket.on('game-over', (stats) => {
            setGameStats(stats);
            setRoundState('gameover');
            setStatus('Game Over!');
        });

        socket.on('round-state-updated', ({ state }) => {
            setRoundState(state);
            if (state === 'sharing') {
                setHasRated(false);
                setRoundResults(null);
                setRoundNumber(prev => prev + 1);
                setStatus('New Round Started');

                // Re-enable video track that was disabled during rating
                if (streamRef.current && streamRef.current.getVideoTracks()?.length > 0) {
                    streamRef.current.getVideoTracks()[0].enabled = true;
                }
            } else if (state === 'rating') {
                setStatus('Rating Phase - Submit your rating!');
            }
        });

        // Fetch TURN servers on mount
        fetchTurnServers();

        if (role === 'host') {
            socket.on('request-stream', handleStreamRequest);
            socket.on('answer', handleReceiveAnswer);
            // Don't auto-call setupHost() — let the user click the button
        } else {
            socket.on('offer', handleReceiveOffer);
            // Auto-retry: request stream every 5 seconds until connected
            const requestStream = () => {
                socket.emit('request-stream', { roomCode, requesterId: socket.id });
            };
            setTimeout(requestStream, 2000); // First request after 2s
            retryInterval.current = setInterval(() => {
                if (!remoteVideoRef.current?.srcObject) {
                    console.log('No stream yet, retrying...');
                    requestStream();
                } else {
                    clearInterval(retryInterval.current);
                }
            }, 5000);
        }

        return () => {
            socket.off('ice-candidate');
            socket.off('round-state-updated');
            socket.off('round-results');
            socket.off('game-over');
            socket.off('request-stream');
            socket.off('answer');
            socket.off('offer');

            // Peer Cleanup
            Object.values(peers.current).forEach(pc => {
                try { pc.close(); } catch (e) { /* ignore */ }
            });
            peers.current = {};

            // Stream Cleanup
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            // Remove hidden audio elements
            document.querySelectorAll('audio[data-peer-audio]').forEach(el => el.remove());

            // Clear retry interval
            if (retryInterval.current) clearInterval(retryInterval.current);
        };
    }, []);

    // ============================================================
    // HOST FUNCTIONS
    // ============================================================
    const setupHost = async () => {
        try {
            setStatus('Starting Screen Share...');
            const s = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });
            streamRef.current = s;
            setHasStream(true);
            if (localVideoRef.current) localVideoRef.current.srcObject = s;
            setStatus('Sharing! Waiting for players...');

            // Process any queued stream requests that arrived before screen was ready
            if (pendingRequests.current.length > 0) {
                console.log(`Processing ${pendingRequests.current.length} queued stream requests`);
                for (const req of pendingRequests.current) {
                    await sendStreamToPlayer(req.requesterId);
                }
                pendingRequests.current = [];
            }
        } catch (err) {
            console.error("Error sharing:", err);
            if (err.name === 'NotAllowedError') {
                setStatus('Share cancelled. Tap the button to try again.');
            } else {
                setStatus('Screen share not supported on this browser. Try Chrome on Android or use a laptop.');
            }
        }
    };

    const handleStreamRequest = async ({ requesterId }) => {
        console.log(`Player ${requesterId} requested stream`);

        // If stream isn't ready yet, queue the request
        if (!streamRef.current) {
            console.log('Stream not ready yet, queuing request...');
            pendingRequests.current.push({ requesterId });
            return;
        }

        await sendStreamToPlayer(requesterId);
    };

    const sendStreamToPlayer = async (requesterId) => {
        await createPeerConnection(requesterId);

        // Add stream tracks from REF (not state!)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                peers.current[requesterId].addTrack(track, streamRef.current);
            });
        }

        const offer = await peers.current[requesterId].createOffer();
        await peers.current[requesterId].setLocalDescription(offer);
        socket.emit('offer', { offer, roomId: roomCode, targetId: requesterId });
    };

    const handleReceiveAnswer = async ({ answer, senderId }) => {
        if (peers.current[senderId]) {
            await peers.current[senderId].setRemoteDescription(new RTCSessionDescription(answer));
        }
    };

    // ============================================================
    // PLAYER FUNCTIONS
    // ============================================================
    const handleReceiveOffer = async ({ offer, senderId }) => {
        console.log("Received Offer from Host");
        await createPeerConnection(senderId);

        // If player has mic enabled, add audio track
        if (window.localAudioStream) {
            window.localAudioStream.getTracks().forEach(track => {
                peers.current[senderId].addTrack(track, window.localAudioStream);
            });
        }

        await peers.current[senderId].setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peers.current[senderId].createAnswer();
        await peers.current[senderId].setLocalDescription(answer);
        socket.emit('answer', { answer, roomId: roomCode, targetId: senderId });
        setStatus('Watching Stream');
    };

    const enableMicrophone = async () => {
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            window.localAudioStream = audioStream;
            setStatus('Microphone Enabled!');
        } catch (err) {
            console.error("Mic Error:", err);
            setStatus('Microphone Access Denied');
        }
    };

    const handleRate = (rating) => {
        socket.emit('submit-rating', { roomCode, rating, username });
        setHasRated(true);
        setStatus('Rating submitted! Waiting for others...');
    };

    // ============================================================
    // SHARED FUNCTIONS
    // ============================================================
    const createPeerConnection = async (remoteId) => {
        // Close existing connection if any
        if (peers.current[remoteId]) {
            try { peers.current[remoteId].close(); } catch (e) { /* ignore */ }
        }

        const pc = new RTCPeerConnection(rtcConfig);
        peers.current[remoteId] = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { candidate: event.candidate, roomId: roomCode, targetId: remoteId });
            }
        };

        pc.ontrack = (event) => {
            console.log("Received Track!", event.track.kind);
            if (role === 'host') {
                const audioId = `audio-${remoteId}`;
                let audio = document.getElementById(audioId);
                if (!audio) {
                    audio = document.createElement('audio');
                    audio.id = audioId;
                    audio.setAttribute('data-peer-audio', 'true');
                    audio.autoplay = true;
                    document.body.appendChild(audio);
                }
                audio.srcObject = event.streams[0];
            } else if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
                setPlayerConnected(true);
                setStatus('Connected! Watching stream');
                if (retryInterval.current) clearInterval(retryInterval.current);
            }
        };

        // Monitor ICE connection state
        pc.oniceconnectionstatechange = () => {
            console.log('ICE state:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                if (role !== 'host') {
                    setPlayerConnected(true);
                    setStatus('Connected!');
                }
            } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                if (role !== 'host') {
                    setPlayerConnected(false);
                    setStatus('Connection lost. Tap Reconnect.');
                }
            }
        };

        return pc;
    };

    const handleReceiveCandidate = async ({ candidate, senderId }) => {
        if (peers.current[senderId]) {
            try {
                await peers.current[senderId].addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.warn('ICE candidate error:', e);
            }
        }
    };

    const toggleRoundState = () => {
        const newState = roundState === 'sharing' ? 'rating' : 'sharing';
        socket.emit('update-round-state', { roomCode, state: newState });
        setRoundState(newState);

        if (streamRef.current && streamRef.current.getVideoTracks()?.length > 0) {
            streamRef.current.getVideoTracks()[0].enabled = (newState === 'sharing');
        }
    };

    // ============================================================
    // UI
    // ============================================================
    const [micEnabled, setMicEnabled] = useState(false);
    const handleMicClick = async () => {
        await enableMicrophone();
        setMicEnabled(true);
    };

    const isOverlay = roundState === 'rating' || roundState === 'results' || roundState === 'gameover';

    return (
        <div className="flex flex-col h-[100dvh] bg-[#0a0a0f] text-white p-2 sm:p-3">
            {/* HEADER */}
            <div className="glass rounded-xl px-3 py-2 sm:px-5 sm:py-3 mb-2 sm:mb-3 flex flex-wrap gap-2 justify-between items-center animate-slide-up">
                <div className="flex gap-2 sm:gap-3 items-center flex-wrap">
                    <h1 className="text-base sm:text-lg font-bold font-display gradient-text">{roomCode}</h1>
                    <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${role === 'host'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                        }`}>
                        {role === 'host' ? '👑 HOST' : '🎮 PLAYER'}
                    </span>
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] bg-white/5 text-gray-400 border border-white/5 font-mono">
                        Round {roundNumber}/3
                    </span>
                    {role !== 'host' && (
                        <button
                            onClick={handleMicClick}
                            disabled={micEnabled}
                            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 ${micEnabled
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'}`}
                        >
                            {micEnabled ? '🎤 On' : '🎤 Mic'}
                        </button>
                    )}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                    <span className="font-medium text-gray-300">{username}</span>
                    <span className="mx-2 text-gray-700">·</span>
                    <span>{status}</span>
                </div>
            </div>

            {/* MAIN VIDEO AREA */}
            <div className="flex-grow min-h-0 flex items-center justify-center bg-gray-950 rounded-xl overflow-hidden relative border border-white/5">
                {roundState === 'rating' && <BlackScreen />}
                {roundState === 'results' && (
                    <Scoreboard
                        results={roundResults}
                        isHost={role === 'host'}
                        onNextRound={() => {
                            socket.emit('update-round-state', { roomCode, state: 'sharing' });
                        }}
                    />
                )}
                {roundState === 'gameover' && (
                    <GameOver
                        stats={gameStats}
                        isHost={role === 'host'}
                        onRestart={() => window.location.reload()}
                    />
                )}

                {role === 'host' ? (
                    <video
                        ref={localVideoRef}
                        autoPlay playsInline muted
                        className={`w-full h-full object-contain transition-opacity duration-500 ${isOverlay ? 'opacity-0' : ''}`}
                    />
                ) : (
                    <video
                        ref={remoteVideoRef}
                        autoPlay playsInline
                        className={`w-full h-full object-contain transition-opacity duration-500 ${isOverlay ? 'opacity-0' : ''}`}
                    />
                )}

                {!hasStream && role === 'host' && (
                    <button onClick={setupHost} className="absolute bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-white font-bold z-20 shadow-xl shadow-indigo-900/40 transition-all duration-300 hover:-translate-y-0.5 text-sm sm:text-base">
                        📸 Start Sharing
                    </button>
                )}

                {role !== 'host' && !playerConnected && !isOverlay && (
                    <div className="absolute flex flex-col items-center gap-3 z-20">
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </div>
                        <p className="text-gray-400 text-sm">Waiting for host's screen...</p>
                        <button
                            onClick={() => {
                                socket.emit('request-stream', { roomCode, requesterId: socket.id });
                                setStatus('Reconnecting...');
                            }}
                            className="px-5 py-2 rounded-lg text-xs font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
                        >
                            🔄 Reconnect
                        </button>
                    </div>
                )}
            </div>

            {/* CONTROLS */}
            <div className="mt-2 sm:mt-3 glass rounded-xl p-2 sm:p-4 flex items-center justify-center min-h-[60px] sm:min-h-[80px]">
                {roundState === 'sharing' ? (
                    role === 'host' ? (
                        <button
                            onClick={toggleRoundState}
                            className="px-6 py-3 sm:px-10 sm:py-4 rounded-xl font-bold text-sm sm:text-lg transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-xl shadow-red-900/40"
                        >
                            ⏸ STOP & RATE
                        </button>
                    ) : (
                        <p className="text-gray-600 text-center uppercase tracking-[0.3em] text-xs">
                            👀 Watch the screen...
                        </p>
                    )
                ) : roundState === 'rating' ? (
                    <RatingControls onRate={handleRate} hasRated={hasRated} />
                ) : null}
            </div>
        </div>
    );
}
