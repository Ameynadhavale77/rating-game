const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { calculateOutlier } = require('./utils/gameLogic');

const app = express();
app.use(cors());

// TURN credentials endpoint for WebRTC cross-network connections
app.get('/api/turn-credentials', async (req, res) => {
    const METERED_API_KEY = process.env.METERED_API_KEY;

    if (METERED_API_KEY) {
        // If Metered API key is set, fetch real TURN servers
        try {
            const response = await fetch(
                `https://metered_api_key.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`
            );
            const servers = await response.json();
            return res.json({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    ...servers
                ]
            });
        } catch (e) {
            console.error('Metered API error:', e);
        }
    }

    // Fallback: multiple STUN servers + free TURN relay
    res.json({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            {
                urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'],
                username: 'peerjs',
                credential: 'peerjsp'
            }
        ]
    });
});

// Serve built React client
app.use(express.static(path.join(__dirname, '../public')));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for the demo
        methods: ["GET", "POST"]
    }
});

const rooms = {}; // { 'CODE': { host: socketId, players: [ { id, username } ] } }

// Helper: Generate 4-letter code
const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

// Socket.io Connection Handler
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Event: Create Room
    socket.on('create-room', ({ username }, callback) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            host: socket.id,
            players: [{ id: socket.id, username, role: 'host' }]
        };
        socket.join(roomCode);
        console.log(`Room created: ${roomCode} by ${username}`);
        callback({ success: true, roomCode });
    });

    // Event: Join Room
    socket.on('join-room', ({ roomCode, username }, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ success: false, message: 'Room not found' });
        }

        room.players.push({ id: socket.id, username, role: 'player' });
        socket.join(roomCode);

        console.log(`${username} joined room ${roomCode}`);

        // Notify everyone in room (including sender) to update list
        io.to(roomCode).emit('player-update', room.players);

        callback({ success: true, roomCode });
    });

    // Event: Start Game
    socket.on('start-game', ({ roomCode }) => {
        io.to(roomCode).emit('game-started');
        console.log(`Game started in room ${roomCode}`);
    });

    // Event: Update Round State (Sharing <-> Rating)
    socket.on('update-round-state', ({ roomCode, state }) => {
        const room = rooms[roomCode];
        if (room) {
            room.roundState = state;
            if (state === 'rating') {
                room.currentRatings = {}; // Reset ratings for new round
            }
            io.to(roomCode).emit('round-state-updated', { state });
            console.log(`Room ${roomCode} state: ${state}`);
        }
    });

    // Event: Submit Rating
    socket.on('submit-rating', ({ roomCode, rating, username }) => {
        const room = rooms[roomCode];
        if (room) {
            room.currentRatings = room.currentRatings || {};
            room.currentRatings[socket.id] = { username, rating };

            console.log(`Rating received: ${rating} from ${username} in ${roomCode}`);

            // Check if ALL players (including host) have rated
            const players = room.players;
            const ratingsCount = Object.keys(room.currentRatings).length;

            console.log(`Ratings: ${ratingsCount}/${players.length}`);



            if (ratingsCount === players.length) {
                // Convert ratings object to array
                const ratingsArray = Object.keys(room.currentRatings).map(id => ({
                    id,
                    ...room.currentRatings[id]
                }));

                const results = calculateOutlier(ratingsArray);

                // Save Round History
                room.rounds = room.rounds || [];
                room.rounds.push(results);

                // Track Outlier Stats
                if (results.outlier) {
                    const outlierId = results.outlier.id;
                    room.outlierCounts = room.outlierCounts || {};
                    room.outlierCounts[outlierId] = (room.outlierCounts[outlierId] || 0) + 1;
                }

                // Check for Game Over (Simplifying to 3 rounds for testing, normally 10)
                const MAX_ROUNDS = 3;
                if (room.rounds.length >= MAX_ROUNDS) {
                    // Calculate Ultimate Loser
                    let maxOutliers = -1;
                    let loserId = null;

                    Object.entries(room.outlierCounts || {}).forEach(([id, count]) => {
                        if (count > maxOutliers) {
                            maxOutliers = count;
                            loserId = id;
                        }
                    });

                    // Fallback if no outliers (rare)
                    if (!loserId && room.players.length > 1) loserId = room.players[1].id;

                    const loser = room.players.find(p => p.id === loserId) || room.players[0] || { username: 'Unknown' };

                    const gameStats = {
                        loser: { ...loser, outlierCount: maxOutliers || 0 },
                        totalRounds: room.rounds.length
                    };

                    io.to(roomCode).emit('game-over', gameStats);
                    console.log("Game Over:", gameStats);
                } else {
                    io.to(roomCode).emit('round-results', results);
                    console.log("Round Results:", results);
                }
            }
        }
    });

    // Event: Ping
    socket.on('ping', (data) => {
        console.log(`Received ping from ${socket.id}:`, data);
        // Respond with Pong
        socket.emit('pong', { message: 'Pong from server!', timestamp: new Date() });
    });

    // Event: WebRTC Offer (Directed to specific target)
    socket.on('offer', ({ offer, roomId, targetId }) => {
        console.log(`Sending offer from ${socket.id} to ${targetId}`);
        io.to(targetId).emit('offer', { offer, senderId: socket.id });
    });

    // Event: WebRTC Answer (Directed to specific target)
    socket.on('answer', ({ answer, roomId, targetId }) => {
        console.log(`Sending answer from ${socket.id} to ${targetId}`);
        io.to(targetId).emit('answer', { answer, senderId: socket.id });
    });

    // Event: ICE Candidate (Directed to specific target)
    socket.on('ice-candidate', ({ candidate, roomId, targetId }) => {
        io.to(targetId).emit('ice-candidate', { candidate, senderId: socket.id });
    });

    // Event: Request Stream (Player asking Host)
    socket.on('request-stream', ({ roomCode, requesterId }) => {
        // Find host of room
        const room = rooms[roomCode];
        if (room && room.players) {
            const host = room.players.find(p => p.role === 'host');
            if (host) {
                console.log(`Forwarding stream request from ${requesterId} to Host ${host.id}`);
                io.to(host.id).emit('request-stream', { requesterId });
            }
        }
    });

    // Event: Disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        // Find if user was in a room
        Object.keys(rooms).forEach(roomCode => {
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);

            if (playerIndex !== -1) {
                const player = room.players[playerIndex];
                room.players.splice(playerIndex, 1);

                console.log(`${player.username} left room ${roomCode}`);

                if (player.role === 'host') {
                    console.log(`Host left, closing room ${roomCode}`);
                    // Notify everyone that room is closed
                    io.to(roomCode).emit('room-closed', { message: 'Host left the game' });
                    delete rooms[roomCode];
                } else {
                    // Update player list for others
                    io.to(roomCode).emit('player-update', room.players);
                }
            }
        });
    });
});

// SPA fallback: serve index.html for any unmatched routes
app.get('{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER RUNNING on port ${PORT}`);
});
