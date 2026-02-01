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
            // Broadcast state AFTER socket has joined the room
            const game = gameManager.getGame(roomCode);
            if (game) game.broadcastState();
        } catch (e) {
            socket.emit('error', e.message);
        }
    });

    socket.on('join_room', ({ roomCode, playerName, pokemonId }) => {
        try {
            const game = gameManager.joinRoom(roomCode, playerName, socket.id, pokemonId);
            socket.join(roomCode);
            socket.emit('joined_room', { roomCode });
            // Broadcast state AFTER socket has joined the room
            if (game) game.broadcastState();
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

    socket.on('pay_jail_fine', ({ roomCode }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.payJailFine(socket.id);
    });

    socket.on('use_jail_card', ({ roomCode }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.useJailCard(socket.id);
    });

    // Auction handlers
    socket.on('pass_property', ({ roomCode }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.passProperty(socket.id);
    });

    socket.on('place_bid', ({ roomCode, amount }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.placeBid(socket.id, amount);
    });

    socket.on('pass_auction', ({ roomCode }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.passAuction(socket.id);
    });

    // Building handlers
    socket.on('build_house', ({ roomCode, propertyIndex }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.buildHouse(socket.id, propertyIndex);
    });

    socket.on('sell_house', ({ roomCode, propertyIndex }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.sellHouse(socket.id, propertyIndex);
    });

    socket.on('buy_hotel', ({ roomCode, propertyIndex }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.buyHotel(socket.id, propertyIndex);
    });

    socket.on('sell_hotel', ({ roomCode, propertyIndex }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.sellHotel(socket.id, propertyIndex);
    });

    // Trading handlers
    socket.on('initiate_trade', ({ roomCode, toPlayerId, offer }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.initiateTrade(socket.id, toPlayerId, offer);
    });

    socket.on('accept_trade', ({ roomCode }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.acceptTrade(socket.id);
    });

    socket.on('decline_trade', ({ roomCode }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.declineTrade(socket.id);
    });

    socket.on('cancel_trade', ({ roomCode }) => {
        const game = gameManager.getGame(roomCode);
        if (game) game.cancelTrade(socket.id);
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
