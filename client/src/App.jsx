import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Lobby from './components/game/Lobby';
import WaitingRoom from './components/game/WaitingRoom';
import GameRoom from './components/game/GameRoom';

// In production, connect to same origin. In dev, connect to localhost:3001
const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : window.location.origin);
const socket = io(SOCKET_URL);

function App() {
    const [gameState, setGameState] = useState('lobby'); // lobby, waiting, game
    const [roomData, setRoomData] = useState({
        roomCode: '',
        username: '',
        role: '',
        players: []
    });

    useEffect(() => {
        // Listen for player updates (someone joined)
        socket.on('player-update', (updatedPlayers) => {
            setRoomData(prev => ({ ...prev, players: updatedPlayers }));
        });

        // Listen for game start
        socket.on('game-started', () => {
            setGameState('game');
        });

        // Listen for room closure
        socket.on('room-closed', ({ message }) => {
            alert(message);
            setGameState('lobby');
            setRoomData({
                roomCode: '',
                username: '',
                role: '',
                players: []
            });
        });

        return () => {
            socket.off('player-update');
            socket.off('game-started');
            socket.off('room-closed');
        };
    }, []);

    const handleJoin = (data) => {
        setRoomData(prev => ({ ...prev, ...data }));
        setGameState('waiting');
    };

    return (
        <>
            {gameState === 'lobby' && <Lobby socket={socket} onJoin={handleJoin} />}
            {gameState === 'waiting' && (
                <WaitingRoom
                    socket={socket}
                    roomCode={roomData.roomCode}
                    players={roomData.players}
                    myUsername={roomData.username}
                />
            )}
            {gameState === 'game' && (
                <GameRoom
                    socket={socket}
                    roomCode={roomData.roomCode}
                    username={roomData.username}
                    role={roomData.role}
                />
            )}
        </>
    );
}

export default App;
