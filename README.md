# Team Rating Outlier Game

## Overview
A real-time multiplayer game where a host shares their screen, and players rate content. The system detects outliers in ratings and assigns challenges.

## Tech Stack
- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Node.js, Express
- **Real-time**: Socket.io
- **Media**: WebRTC (Screen Share & Audio)
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT

## Project Structure

### Client (`/client`)
Frontend application built with React and Vite.
- `src/components/game`: Game-specific logic (Rating, Scoreboard, etc.)
- `src/components/webrtc`: WebRTC implementation (Screen share, Audio)
- `src/context`: Global state (Game state, Auth state)
- `src/hooks`: Custom hooks (`useSocket`, `useWebRTC`)
- `src/services`: API and Socket service layers

### Server (`/server`)
Backend application built with Node.js and Express.
- `src/controllers`: Request handlers for API routes
- `src/models`: Database schemas (User, GameSession, Round, Rating)
- `src/routes`: API route definitions
- `src/services`: Business logic (Socket execution, WebRTC signaling, Outlier math)
- `src/utils`: Helper functions

## implementation Steps
1. **Project Setup**: Folder structure (Done)
2. **WebSockets Demo**: Basic connection test (Next)
3. **WebRTC Basics**: Peer connection test
4. **Core Implementation**: Dependencies & Base code
5. **Game Features**: Screen share, Ratings, Outliers
6. **Polish**: UI & Final tests
