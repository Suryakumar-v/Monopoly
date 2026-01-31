const MonopolyGame = require('./MonopolyGame');

class GameManager {
    constructor(io) {
        this.io = io;
        this.games = new Map(); // roomCode -> MonopolyGame
    }

    createRoom(hostName, socketId) {
        const roomCode = this.generateRoomCode();
        const game = new MonopolyGame(roomCode, this.io);
        game.addPlayer(socketId, hostName, true); // true = methods
        this.games.set(roomCode, game);
        return roomCode;
    }

    joinRoom(roomCode, playerName, socketId) {
        const game = this.games.get(roomCode);
        if (!game) {
            throw new Error("Room not found");
        }
        game.addPlayer(socketId, playerName, false);
        return game;
    }

    getGame(roomCode) {
        return this.games.get(roomCode);
    }

    handleDisconnect(socketId) {
        // Find game with this player and handle removal/pause
        for (const game of this.games.values()) {
            if (game.hasPlayer(socketId)) {
                game.removePlayer(socketId);
                if (game.isEmpty()) {
                    this.games.delete(game.roomCode);
                }
                break;
            }
        }
    }

    generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
}

module.exports = GameManager;
