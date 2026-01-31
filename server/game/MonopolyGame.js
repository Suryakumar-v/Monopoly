const properties = require('../data/properties');

class MonopolyGame {
    constructor(roomCode, io) {
        this.roomCode = roomCode;
        this.io = io;
        this.players = []; // Array of player objects
        this.gameState = 'LOBBY'; // LOBBY, PLAYING, ENDED
        this.currentTurnIndex = 0;
        this.board = properties.map(p => ({ ...p, owner: null }));
        this.logs = [];
    }

    addPlayer(socketId, name, isHost, pokemonId) {
        if (this.gameState !== 'LOBBY') {
            // Allow reconnection logic if needed, but for now reject
            return;
        }
        const player = {
            id: socketId,
            name,
            isHost,
            pokemonId,
            money: 1500,
            position: 0,
            color: this.assignColor(this.players.length),
            isBankrupt: false
        };
        this.players.push(player);
        this.broadcastState();
    }

    removePlayer(socketId) {
        this.players = this.players.filter(p => p.id !== socketId);
        this.broadcastState();
    }

    hasPlayer(socketId) {
        return this.players.some(p => p.id === socketId);
    }

    assignColor(index) {
        const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FFFF33', '#33FFFF'];
        return colors[index % colors.length];
    }

    startGame() {
        if (this.players.length < 2) return; // Need at least 2 players
        this.gameState = 'PLAYING';
        this.currentTurnIndex = 0;
        this.broadcastState();
        this.io.to(this.roomCode).emit('game_started');
    }

    rollDice(socketId) {
        if (this.players[this.currentTurnIndex].id !== socketId) return;

        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const total = die1 + die2;

        const player = this.players[this.currentTurnIndex];
        player.position = (player.position + total) % 40; // 40 spaces on board usually
        // Simplified board logic: use properties length if we only have properties
        // But standard board has 40 spaces. We only defined properties.
        // For this prototype, let's map properties to indices or just cycle through properties.
        // Let's assume standard board layout (40 spaces) but only mapped properties.
        // Actually, to make it playable with just the file I created, let's just cycle through the properties array.
        // There are 22 properties in the file. + Utilities + Railroads + Corners = 40.
        // Let's assume a simplified board where it's just the properties.
        // Or I should map them properly.
        // Let's stick to the properties list size for now to avoid complexity of empty spaces.

        player.position = (player.position + total) % this.board.length;

        this.logs.push(`${player.name} rolled ${die1} + ${die2} = ${total}`);

        this.handleLanding(player);

        // Next turn
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
        this.broadcastState();
    }

    handleLanding(player) {
        const property = this.board[player.position];
        if (property.owner && property.owner !== player.id) {
            // Pay rent
            const rent = property.rent[0]; // Base rent
            const owner = this.players.find(p => p.id === property.owner);
            if (owner) {
                player.money -= rent;
                owner.money += rent;
                this.logs.push(`${player.name} paid $${rent} rent to ${owner.name}`);
            }
        }
    }

    buyProperty(socketId) {
        const player = this.players.find(p => p.id === socketId);
        if (!player) return;

        const property = this.board[player.position];
        if (!property.owner && player.money >= property.price) {
            player.money -= property.price;
            property.owner = player.id;
            this.logs.push(`${player.name} bought ${property.name} for $${property.price}`);
            this.broadcastState();
        }
    }

    isEmpty() {
        return this.players.length === 0;
    }

    broadcastState() {
        this.io.to(this.roomCode).emit('game_state', {
            players: this.players,
            board: this.board,
            gameState: this.gameState,
            currentTurn: this.players[this.currentTurnIndex]?.id,
            logs: this.logs
        });
    }
}

module.exports = MonopolyGame;
