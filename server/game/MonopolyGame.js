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
        this.lastDrawnCard = null;

        // Auction state
        this.auction = null; // { propertyIndex, currentBid, currentBidder, participants }
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

    // Pass on buying - starts auction
    passProperty(socketId) {
        const player = this.players.find(p => p.id === socketId);
        if (!player) return;

        const property = this.board[player.position];
        if (!property.owner && property.price > 0) {
            this.startAuction(player.position);
        }
    }

    startAuction(propertyIndex) {
        const property = this.board[propertyIndex];
        this.auction = {
            propertyIndex,
            propertyName: property.name,
            currentBid: 0,
            currentBidder: null,
            currentBidderName: null,
            activePlayers: this.players.filter(p => !p.isBankrupt).map(p => p.id),
            passedPlayers: []
        };
        this.logs.push(`🔨 AUCTION started for ${property.name}!`);
        this.broadcastState();
    }

    placeBid(socketId, amount) {
        if (!this.auction) return;

        const player = this.players.find(p => p.id === socketId);
        if (!player || player.isBankrupt) return;

        // Check if bid is valid
        if (amount <= this.auction.currentBid) return;
        if (amount > player.money) return;

        this.auction.currentBid = amount;
        this.auction.currentBidder = player.id;
        this.auction.currentBidderName = player.name;
        // Reset passed players when new bid comes in
        this.auction.passedPlayers = [];

        this.logs.push(`${player.name} bids ₹${amount}`);
        this.broadcastState();
    }

    passAuction(socketId) {
        if (!this.auction) return;

        const player = this.players.find(p => p.id === socketId);
        if (!player) return;

        if (!this.auction.passedPlayers.includes(socketId)) {
            this.auction.passedPlayers.push(socketId);
            this.logs.push(`${player.name} passes`);
        }

        // Check if all other players have passed
        const activePlayers = this.players.filter(p => !p.isBankrupt && p.id !== this.auction.currentBidder);
        const allPassed = activePlayers.every(p => this.auction.passedPlayers.includes(p.id));

        if (allPassed && this.auction.currentBidder) {
            this.endAuction();
        } else if (this.auction.passedPlayers.length >= this.players.filter(p => !p.isBankrupt).length) {
            // Everyone passed, no bids - property remains unsold
            this.logs.push(`No bids. ${this.auction.propertyName} remains unsold.`);
            this.auction = null;
        }

        this.broadcastState();
    }

    endAuction() {
        if (!this.auction || !this.auction.currentBidder) return;

        const winner = this.players.find(p => p.id === this.auction.currentBidder);
        const property = this.board[this.auction.propertyIndex];

        if (winner) {
            winner.money -= this.auction.currentBid;
            property.owner = winner.id;
            this.logs.push(`🎉 ${winner.name} wins ${property.name} for ₹${this.auction.currentBid}!`);
        }

        this.auction = null;
        this.broadcastState();
    }

    // === BUILDING HOUSES & HOTELS ===
    buildHouse(socketId, propertyIndex) {
        const player = this.players.find(p => p.id === socketId);
        const property = this.board[propertyIndex];

        if (!player || !property || property.owner !== player.id) return;
        if (!property.group || property.houses >= 4 || property.hasHotel) return;

        // Must own all of the color group
        if (!this.checkMonopoly(player.id, property.group)) return;

        // Must build evenly - check if this property has fewer houses than others
        const groupProps = this.board.filter(p => p.group === property.group && p.owner === player.id);
        const minHouses = Math.min(...groupProps.map(p => p.houses));
        if (property.houses > minHouses) return;

        // House price is typically the same as property price / 2 or listed
        const housePrice = property.housePrice || Math.floor(property.price / 2);
        if (player.money < housePrice) return;

        player.money -= housePrice;
        property.houses++;
        this.logs.push(`${player.name} built a house on ${property.name} for ₹${housePrice}`);
        this.broadcastState();
    }

    sellHouse(socketId, propertyIndex) {
        const player = this.players.find(p => p.id === socketId);
        const property = this.board[propertyIndex];

        if (!player || !property || property.owner !== player.id) return;
        if (property.houses <= 0) return;

        // Must sell evenly
        const groupProps = this.board.filter(p => p.group === property.group && p.owner === player.id);
        const maxHouses = Math.max(...groupProps.map(p => p.houses));
        if (property.houses < maxHouses) return;

        const housePrice = property.housePrice || Math.floor(property.price / 2);
        const sellPrice = Math.floor(housePrice / 2);

        player.money += sellPrice;
        property.houses--;
        this.logs.push(`${player.name} sold a house from ${property.name} for ₹${sellPrice}`);
        this.broadcastState();
    }

    buyHotel(socketId, propertyIndex) {
        const player = this.players.find(p => p.id === socketId);
        const property = this.board[propertyIndex];

        if (!player || !property || property.owner !== player.id) return;
        if (property.houses !== 4 || property.hasHotel) return;

        const hotelPrice = property.housePrice || Math.floor(property.price / 2);
        if (player.money < hotelPrice) return;

        player.money -= hotelPrice;
        property.houses = 0;
        property.hasHotel = true;
        this.logs.push(`${player.name} built a HOTEL on ${property.name} for ₹${hotelPrice}`);
        this.broadcastState();
    }

    sellHotel(socketId, propertyIndex) {
        const player = this.players.find(p => p.id === socketId);
        const property = this.board[propertyIndex];

        if (!player || !property || property.owner !== player.id) return;
        if (!property.hasHotel) return;

        const hotelPrice = property.housePrice || Math.floor(property.price / 2);
        const sellPrice = Math.floor(hotelPrice / 2);

        player.money += sellPrice;
        property.hasHotel = false;
        property.houses = 4; // Convert back to 4 houses
        this.logs.push(`${player.name} sold the hotel from ${property.name} for ₹${sellPrice}`);
        this.broadcastState();
    }

    // === TRADING ===
    initiateTrade(fromId, toId, offer) {
        // offer = { money: 100, properties: [1, 5], request: { money: 50, properties: [3] } }
        const fromPlayer = this.players.find(p => p.id === fromId);
        const toPlayer = this.players.find(p => p.id === toId);

        if (!fromPlayer || !toPlayer) return;

        this.pendingTrade = {
            from: fromId,
            fromName: fromPlayer.name,
            to: toId,
            toName: toPlayer.name,
            offerMoney: offer.money || 0,
            offerProperties: offer.properties || [],
            requestMoney: offer.request?.money || 0,
            requestProperties: offer.request?.properties || []
        };

        this.logs.push(`${fromPlayer.name} proposed a trade to ${toPlayer.name}`);
        this.broadcastState();
    }

    acceptTrade(socketId) {
        if (!this.pendingTrade || this.pendingTrade.to !== socketId) return;

        const fromPlayer = this.players.find(p => p.id === this.pendingTrade.from);
        const toPlayer = this.players.find(p => p.id === this.pendingTrade.to);

        if (!fromPlayer || !toPlayer) return;

        // Transfer money
        fromPlayer.money -= this.pendingTrade.offerMoney;
        fromPlayer.money += this.pendingTrade.requestMoney;
        toPlayer.money += this.pendingTrade.offerMoney;
        toPlayer.money -= this.pendingTrade.requestMoney;

        // Transfer properties
        this.pendingTrade.offerProperties.forEach(idx => {
            if (this.board[idx]?.owner === fromPlayer.id) {
                this.board[idx].owner = toPlayer.id;
            }
        });

        this.pendingTrade.requestProperties.forEach(idx => {
            if (this.board[idx]?.owner === toPlayer.id) {
                this.board[idx].owner = fromPlayer.id;
            }
        });

        this.logs.push(`Trade accepted! ${fromPlayer.name} and ${toPlayer.name} traded.`);
        this.pendingTrade = null;
        this.broadcastState();
    }

    declineTrade(socketId) {
        if (!this.pendingTrade || this.pendingTrade.to !== socketId) return;

        const toPlayer = this.players.find(p => p.id === socketId);
        this.logs.push(`${toPlayer?.name} declined the trade.`);
        this.pendingTrade = null;
        this.broadcastState();
    }

    cancelTrade(socketId) {
        if (!this.pendingTrade || this.pendingTrade.from !== socketId) return;

        this.logs.push(`Trade cancelled.`);
        this.pendingTrade = null;
        this.broadcastState();
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
            lastDrawnCard: this.lastDrawnCard,
            auction: this.auction,
            pendingTrade: this.pendingTrade
        });
    }
}

module.exports = MonopolyGame;
