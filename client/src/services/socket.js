import { io } from 'socket.io-client';

// Use relative URL for socket to work with proxy in dev
// or explicit localhost:3001 if not proxied
const URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.MODE === 'production' ? 'https://monopoly-server-fo9y.onrender.com' : 'http://localhost:3001');

export const socket = io(URL, {
    autoConnect: true
});
