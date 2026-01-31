import { io } from 'socket.io-client';

// Use relative URL for socket to work with proxy in dev
// or explicit localhost:3001 if not proxied
const URL = import.meta.env.PROD ? undefined : 'http://localhost:3001';

export const socket = io(URL, {
    autoConnect: true
});
