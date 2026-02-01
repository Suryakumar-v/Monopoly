const properties = require('../data/properties');
const { chanceCards, communityChestCards, shuffle } = require('../data/cards');

class MonopolyGame {
    constructor(roomCode, io) {
        this.roomCode = roomCode;
        this.io = io;
        this.players = [];
        this.gameState = 'LOBBY'; // LOBBY, PLAYING, ENDED
        this.currentTurnIndex = 0;
        this.board = properties.map(p => ({ ...p, owner: null, houses: 0, hasHotel: false, isMortgaged: false }));
        this.logs = [];
        this.doublesCount = 0;
        this.lastDiceRoll = [0, 0];

        // Card decks
        this.chanceDeck = shuffle(chanceCards);
        this.communityChestDeck = shuffle(communityChestCards);
        this.lastDrawnCard = null; // Store last drawn card for UI
    }

    addPlayer(socketId, name, isHost, pokemonId) {
        if (this.gameState !== 'LOBBY') return;

        const player = {
            id: socketId,
            name,
            isHost,
            pokemonId,
            money: 1500,
            position: 0,
            color: this.assignColor(this.players.length),
            isBankrupt: false,
            inJail: false,
            jailTurns: 0,
            getOutOfJailCards: 0
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

    startGame(testMode = false) {
        if (!testMode && this.players.length < 2) return;
        if (this.players.length < 1) return;

        this.gameState = 'PLAYING';
        this.currentTurnIndex = 0;
        this.doublesCount = 0;
        this.broadcastState();
        this.io.to(this.roomCode).emit('game_started');
    }

    rollDice(socketId) {
        const player = this.players[this.currentTurnIndex];
        if (player.id !== socketId) return;

        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const total = die1 + die2;
        const isDoubles = die1 === die2;

        this.lastDiceRoll = [die1, die2];
        this.logs.push(`${player.name} rolled ${die1} + ${die2} = ${total}`);

        // Handle Jail
        if (player.inJail) {
            if (isDoubles) {
                // Got out of jail by rolling doubles
                player.inJail = false;
                player.jailTurns = 0;
                this.logs.push(`${player.name} rolled doubles and got out of Jail!`);
                this.movePlayer(player, total);
            } else {
                player.jailTurns++;
                if (player.jailTurns >= 3) {
                    // Must pay and get out after 3 turns
                    player.money -= 50;
                    player.inJail = false;
                    player.jailTurns = 0;
                    this.logs.push(`${player.name} paid ₹50 after 3 turns and left Jail`);
                    this.movePlayer(player, total);
                } else {
                    this.logs.push(`${player.name} is still in Jail (attempt ${player.jailTurns}/3)`);
                }
            }
            this.io.to(this.roomCode).emit('roll_completed', { playerId: socketId, canRollAgain: false });
            this.broadcastState();
            return;
        }

        // Doubles logic (not in jail)
        if (isDoubles) {
            this.doublesCount++;
            if (this.doublesCount >= 3) {
                // 3 doubles = go to jail
                this.sendToJail(player);
                this.logs.push(`${player.name} rolled 3 doubles and goes to Jail!`);
                this.doublesCount = 0;
                this.io.to(this.roomCode).emit('roll_completed', { playerId: socketId, canRollAgain: false });
                this.broadcastState();
                return;
            }
        } else {
            this.doublesCount = 0;
        }

        this.movePlayer(player, total);

        // If doubles, player can roll again
        this.io.to(this.roomCode).emit('roll_completed', {
            playerId: socketId,
            canRollAgain: isDoubles && !player.inJail
        });
        this.broadcastState();
    }

    movePlayer(player, spaces) {
        const oldPosition = player.position;
        player.position = (player.position + spaces) % this.board.length;

        // Check if passed GO (but not sent to jail)
        if (player.position < oldPosition && !player.inJail) {
            player.money += 200;
            this.logs.push(`${player.name} passed GO and collected ₹200`);
        }

        this.handleLanding(player);
    }

    handleLanding(player) {
        const space = this.board[player.position];

        // Go To Jail space (index 30)
        if (space.id === 'goto_jail') {
            this.sendToJail(player);
            this.logs.push(`${player.name} landed on Go To Jail!`);
            return;
        }

        // Chance cards
        if (space.name === 'Chance') {
            this.drawCard(player, 'chance');
            return;
        }

        // Community Chest cards
        if (space.name === 'Community Chest') {
            this.drawCard(player, 'community');
            return;
        }

        // Tax spaces
        if (space.type === 'tax') {
            const taxAmount = space.id === 'income_tax' ? 200 : 100;
            player.money -= taxAmount;
            this.logs.push(`${player.name} paid ₹${taxAmount} tax`);
            return;
        }

        // If property is owned by someone else, pay rent
        if (space.owner && space.owner !== player.id && !space.isMortgaged) {
            const rent = this.calculateRent(space, player);
            const owner = this.players.find(p => p.id === space.owner);
            if (owner && rent > 0) {
                player.money -= rent;
                owner.money += rent;
                this.logs.push(`${player.name} paid ₹${rent} rent to ${owner.name}`);
            }
        }
    }

    drawCard(player, type) {
        const deck = type === 'chance' ? this.chanceDeck : this.communityChestDeck;
        const card = deck.shift(); // Draw from top

        this.logs.push(`${player.name} drew: "${card.text}"`);
        this.lastDrawnCard = { ...card, type };

        // Execute card effect
        this.executeCardEffect(player, card);

        // Put card back at bottom (unless it's Get Out of Jail Free)
        if (card.action !== 'jail_card') {
            deck.push(card);
        }
    }

    executeCardEffect(player, card) {
        switch (card.action) {
            case 'move':
                const oldPos = player.position;
                player.position = card.destination;
                // Check if passed GO
                if (player.position < oldPos && !card.collectGO) {
                    player.money += 200;
                    this.logs.push(`${player.name} passed GO and collected ₹200`);
                }
                if (card.collectGO) {
                    player.money += 200;
                }
                this.handleLanding(player); // Handle new space
                break;

            case 'move_back':
                player.position = (player.position - card.spaces + this.board.length) % this.board.length;
                this.handleLanding(player);
                break;

            case 'collect':
                player.money += card.amount;
                break;

            case 'pay':
                player.money -= card.amount;
                break;

            case 'go_jail':
                this.sendToJail(player);
                break;

            case 'jail_card':
                player.getOutOfJailCards++;
                this.logs.push(`${player.name} now has a Get Out of Jail Free card!`);
                break;

            case 'pay_each':
                // Pay each other player
                const otherPlayers = this.players.filter(p => p.id !== player.id && !p.isBankrupt);
                const totalPay = card.amount * otherPlayers.length;
                player.money -= totalPay;
                otherPlayers.forEach(p => p.money += card.amount);
                break;

            case 'collect_each':
                // Collect from each player
                const payers = this.players.filter(p => p.id !== player.id && !p.isBankrupt);
                payers.forEach(p => {
                    p.money -= card.amount;
                    player.money += card.amount;
                });
                break;

            case 'repairs':
                // Count houses and hotels
                let houses = 0, hotels = 0;
                this.board.forEach(s => {
                    if (s.owner === player.id) {
                        if (s.hasHotel) hotels++;
                        else houses += s.houses;
                    }
                });
                const repairCost = (houses * card.housePrice) + (hotels * card.hotelPrice);
                player.money -= repairCost;
                if (repairCost > 0) {
                    this.logs.push(`${player.name} paid ₹${repairCost} for repairs`);
                }
                break;

            case 'nearest_station':
                // Find nearest station
                const stations = [5, 15, 25, 35]; // Station indices
                let nearestStation = stations.find(s => s > player.position) || stations[0];
                const stationOldPos = player.position;
                player.position = nearestStation;
                if (player.position < stationOldPos) {
                    player.money += 200;
                    this.logs.push(`${player.name} passed GO and collected ₹200`);
                }
                // Pay double rent if owned
                const stationSpace = this.board[nearestStation];
                if (stationSpace.owner && stationSpace.owner !== player.id) {
                    const rent = this.calculateRent(stationSpace, player) * 2;
                    const owner = this.players.find(p => p.id === stationSpace.owner);
                    if (owner) {
                        player.money -= rent;
                        owner.money += rent;
                        this.logs.push(`${player.name} paid ₹${rent} (double) rent to ${owner.name}`);
                    }
                }
                break;

            case 'nearest_utility':
                // Find nearest utility
                const utilities = [12, 28]; // Utility indices
                let nearestUtility = utilities.find(u => u > player.position) || utilities[0];
                const utilOldPos = player.position;
                player.position = nearestUtility;
                if (player.position < utilOldPos) {
                    player.money += 200;
                    this.logs.push(`${player.name} passed GO and collected ₹200`);
                }
                // Pay 10x dice if owned
                const utilitySpace = this.board[nearestUtility];
                if (utilitySpace.owner && utilitySpace.owner !== player.id) {
                    const diceTotal = this.lastDiceRoll[0] + this.lastDiceRoll[1];
                    const rent = diceTotal * 10;
                    const owner = this.players.find(p => p.id === utilitySpace.owner);
                    if (owner) {
                        player.money -= rent;
                        owner.money += rent;
                        this.logs.push(`${player.name} paid ₹${rent} (10× dice) to ${owner.name}`);
                    }
                }
                break;
        }
    }

    calculateRent(space, player) {
        const owner = this.players.find(p => p.id === space.owner);
        if (!owner) return 0;

        // Utility rent: 4x or 10x dice roll
        if (space.type === 'utility') {
            const utilitiesOwned = this.board.filter(s => s.type === 'utility' && s.owner === owner.id).length;
            const diceTotal = this.lastDiceRoll[0] + this.lastDiceRoll[1];
            return utilitiesOwned === 2 ? diceTotal * 10 : diceTotal * 4;
        }

        // Station rent: based on how many owned
        if (space.group === 'station') {
            const stationsOwned = this.board.filter(s => s.group === 'station' && s.owner === owner.id).length;
            const stationRents = [25, 50, 100, 200];
            return stationRents[stationsOwned - 1] || 25;
        }

        // Property rent
        if (space.rent && space.rent.length > 0) {
            // Check if owner has monopoly (all of same color)
            const hasMonopoly = this.checkMonopoly(owner.id, space.group);

            if (space.hasHotel) {
                return space.rent[5]; // Hotel rent
            } else if (space.houses > 0) {
                return space.rent[space.houses]; // House rent (1-4 houses)
            } else if (hasMonopoly) {
                return space.rent[0] * 2; // Double rent for monopoly
            } else {
                return space.rent[0]; // Base rent
            }
        }

        return 0;
    }

    checkMonopoly(playerId, group) {
        if (!group) return false;
        const groupProperties = this.board.filter(s => s.group === group);
        return groupProperties.every(s => s.owner === playerId);
    }

    sendToJail(player) {
        player.position = 10; // Jail is at index 10
        player.inJail = true;
        player.jailTurns = 0;
    }

    payJailFine(socketId) {
        const player = this.players.find(p => p.id === socketId);
        if (!player || !player.inJail) return;

        if (player.money >= 50) {
            player.money -= 50;
            player.inJail = false;
            player.jailTurns = 0;
            this.logs.push(`${player.name} paid ₹50 to get out of Jail`);
            this.broadcastState();
        }
    }

    useJailCard(socketId) {
        const player = this.players.find(p => p.id === socketId);
        if (!player || !player.inJail || player.getOutOfJailCards < 1) return;

        player.getOutOfJailCards--;
        player.inJail = false;
        player.jailTurns = 0;
        this.logs.push(`${player.name} used a Get Out of Jail Free card!`);
        this.broadcastState();
    }

    endTurn(socketId) {
        if (this.players[this.currentTurnIndex].id !== socketId) return;

        this.doublesCount = 0;
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;

        // Skip bankrupt players
        while (this.players[this.currentTurnIndex].isBankrupt) {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
        }

        this.broadcastState();
    }

    buyProperty(socketId) {
        const player = this.players.find(p => p.id === socketId);
        if (!player) return;

        const property = this.board[player.position];
        if (!property.owner && property.price > 0 && player.money >= property.price) {
            player.money -= property.price;
            property.owner = player.id;
            this.logs.push(`${player.name} bought ${property.name} for ₹${property.price}`);
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
            logs: this.logs,
            lastDrawnCard: this.lastDrawnCard
        });
    }
}

module.exports = MonopolyGame;
