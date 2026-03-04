import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

// STUN servers help peers find each other through NATs/Firewalls
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

export default function WebRTCDemo() {
    const [role, setRole] = useState(null); // 'host' or 'viewer'
    const [status, setStatus] = useState('Idle');

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);

    useEffect(() => {
        // 1. Setup Socket Listeners for Signaling
        socket.on('offer', handleReceiveOffer);
        socket.on('answer', handleReceiveAnswer);
        socket.on('ice-candidate', handleReceiveCandidate);
        socket.on('user-connected', () => console.log("User joined room"));

        socket.emit('join-room', 'demo-room');

        return () => {
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
            socket.off('user-connected');
        };
    }, []);

    // --- HOST LOGIC (Initiator) ---
    const startScreenShare = async () => {
        setRole('host');
        setStatus('Getting Screen Stream...');

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            // Create PeerConnection
            createPeerConnection();

            // Add tracks to connection
            stream.getTracks().forEach(track => {
                peerConnection.current.addTrack(track, stream);
            });

            // Create Offer
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);

            // Send Offer via Socket
            socket.emit('offer', { offer, roomId: 'demo-room' });
            setStatus('Offer Sent. Waiting for Answer...');

        } catch (err) {
            console.error("Error sharing screen:", err);
            setStatus('Error accessing screen');
        }
    };

    // --- VIEWER LOGIC (Receiver) ---
    const joinAsViewer = () => {
        setRole('viewer');
        createPeerConnection();
        setStatus('Waiting for Host to share...');
    };

    // --- SHARED WebRTC LOGIC ---
    const createPeerConnection = () => {
        peerConnection.current = new RTCPeerConnection(rtcConfig);

        // Handle ICE Candidates (Network Discovery)
        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { candidate: event.candidate, roomId: 'demo-room' });
            }
        };

        // Handle Incoming Stream
        peerConnection.current.ontrack = (event) => {
            console.log("Received Remote Stream");
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };
    };

    const handleReceiveOffer = async ({ offer }) => {
        if (role === 'host') return; // Host ignores offers
        console.log("Received Offer");
        setRole('viewer');

        if (!peerConnection.current) createPeerConnection();

        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        socket.emit('answer', { answer, roomId: 'demo-room' });
        setStatus('Answer Sent! Connection establishing...');
    };

    const handleReceiveAnswer = async ({ answer }) => {
        if (role === 'viewer') return;
        console.log("Received Answer");
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        setStatus('Connected! Sharing...');
    };

    const handleReceiveCandidate = async ({ candidate }) => {
        if (peerConnection.current) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-4">WebRTC Screen Share Demo</h1>
            <p className="mb-4 text-gray-400">Status: {status}</p>

            {!role && (
                <div className="flex gap-4">
                    <button onClick={startScreenShare} className="bg-green-600 px-6 py-3 rounded text-lg font-bold">
                        Start as HOST (Share Screen)
                    </button>
                    <button onClick={joinAsViewer} className="bg-blue-600 px-6 py-3 rounded text-lg font-bold">
                        Join as VIEWER (Watch)
                    </button>
                </div>
            )}

            <div className="mt-8 flex gap-8 w-full max-w-6xl">
                {/* HOST VIEW */}
                {(role === 'host') && (
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold mb-2 text-green-400">Your Screen (Host)</h2>
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full bg-black rounded border border-green-500" />
                    </div>
                )}

                {/* VIEWER VIEW */}
                {(role === 'viewer' || role === 'host') && (
                    <div className="flex-1">
                        {role === 'host' ? null : (
                            <>
                                <h2 className="text-xl font-semibold mb-2 text-blue-400">Remote Screen (Viewer)</h2>
                                <video ref={remoteVideoRef} autoPlay playsInline className="w-full bg-black rounded border border-blue-500" />
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-8 text-sm text-gray-500 max-w-2xl">
                <h3 className="font-bold text-gray-300">How to test locally:</h3>
                <ol className="list-decimal pl-5 space-y-1">
                    <li>Open this page in Tab A. Click <strong>Start as HOST</strong>. Select a screen to share.</li>
                    <li>Open this page in Tab B (Incognito recommended). Click <strong>Join as VIEWER</strong>.</li>
                    <li>You should see Tab A's screen appear in Tab B.</li>
                </ol>
            </div>
        </div>
    );
}
