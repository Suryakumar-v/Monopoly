const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const GameManager = require('./game/GameManager');

const properties = require('./data/properties');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

const gameManager = new GameManager(io);

const PORT = process.env.PORT || 3001;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', ({ playerName, pokemonId }) => {
        try {
            const roomCode = gameManager.createRoom(playerName, socket.id, pokemonId);
            socket.join(roomCode);
            socket.emit('room_created', { roomCode });
        } catch (e) {
            socket.emit('error', e.message);
        }
    });

    socket.on('join_room', ({ roomCode, playerName, pokemonId }) => {
        try {
            const game = gameManager.joinRoom(roomCode, playerName, socket.id, pokemonId);
            socket.join(roomCode);
            socket.emit('joined_room', { roomCode });
        } catch (e) {
            socket.emit('error', e.message);
        }
    });

    socket.on('start_game', ({ roomCode }) => {
        const game = gameManager.getGame(roomCode);
        if (game && game.players[0].id === socket.id) {
            game.startGame(false);
        }
    });

    socket.on('start_test_game', ({ roomCode }) => {
        const game = gameManager.getGame(roomCode);
        if (game && game.players[0].id === socket.id) {
            game.startGame(true); // Test mode - allows 1 player
        }
    });

    socket.on('roll_dice', ({ roomCode }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.rollDice(socket.id);
    });

    socket.on('buy_property', ({ roomCode }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.buyProperty(socket.id);
    });

    socket.on('end_turn', ({ roomCode }) => {
        try {
            const game = gameManager.getGame(roomCode);
            if (game) {
                game.endTurn(socket.id);
            }
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        gameManager.handleDisconnect(socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
