import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import './Board.css';

export default function Board({ gameData, myId, roomCode }) {
    const { players, board, currentTurn, logs, auction, pendingTrade } = gameData;

    // currentTurn is a player ID, not an index
    const currentPlayer = players.find(p => p.id === currentTurn);
    const isMyTurn = currentTurn === myId;
    const me = players.find(p => p.id === myId);

    const [hasRolled, setHasRolled] = useState(false);
    const [canRollAgain, setCanRollAgain] = useState(false);
    const [bidAmount, setBidAmount] = useState(10);

    // Trade state
    const [tradeTarget, setTradeTarget] = useState(null);
    const [tradeOffer, setTradeOffer] = useState({ money: 0, requestMoney: 0 });

    useEffect(() => {
        const onRollComplete = ({ playerId, canRollAgain: canRoll }) => {
            if (playerId === myId) {
                setHasRolled(true);
                setCanRollAgain(canRoll || false);
            }
        };
        setHasRolled(false);
        setCanRollAgain(false);
        socket.on('roll_completed', onRollComplete);
        return () => socket.off('roll_completed', onRollComplete);
    }, [currentTurn, myId]);

    const handleRoll = () => socket.emit('roll_dice', { roomCode });
    const handleEndTurn = () => {
        socket.emit('end_turn', { roomCode });
        setHasRolled(false);
        setCanRollAgain(false);
    };
    const handleBuy = () => socket.emit('buy_property', { roomCode });
    const handlePayJailFine = () => socket.emit('pay_jail_fine', { roomCode });
    const handleUseJailCard = () => socket.emit('use_jail_card', { roomCode });

    // Auction handlers
    const handlePassProperty = () => socket.emit('pass_property', { roomCode });
    const handlePlaceBid = () => {
        socket.emit('place_bid', { roomCode, amount: bidAmount });
        setBidAmount(bidAmount + 10);
    };
    const handlePassAuction = () => socket.emit('pass_auction', { roomCode });

    // Building handlers
    const handleBuildHouse = (propertyIndex) => socket.emit('build_house', { roomCode, propertyIndex });
    const handleSellHouse = (propertyIndex) => socket.emit('sell_house', { roomCode, propertyIndex });
    const handleBuyHotel = (propertyIndex) => socket.emit('buy_hotel', { roomCode, propertyIndex });
    const handleSellHotel = (propertyIndex) => socket.emit('sell_hotel', { roomCode, propertyIndex });

    // Trade handlers
    const handleSendTrade = () => {
        socket.emit('initiate_trade', {
            roomCode,
            toPlayerId: tradeTarget,
            offer: { money: tradeOffer.money, request: { money: tradeOffer.requestMoney } }
        });
        setTradeTarget(null);
        setTradeOffer({ money: 0, requestMoney: 0 });
    };
    const handleAcceptTrade = () => socket.emit('accept_trade', { roomCode });
    const handleDeclineTrade = () => socket.emit('decline_trade', { roomCode });

    // Check if player has monopoly on a color group
    const checkMonopoly = (group) => {
        if (!group) return false;
        const groupProps = board.filter(s => s.group === group);
        return groupProps.every(s => s.owner === myId);
    };

    // Grid position
    const getGridPosition = (index) => {
        if (index === 0) return { gridColumn: 11, gridRow: 11 };
        if (index >= 1 && index <= 9) return { gridColumn: 11 - index, gridRow: 11 };
        if (index === 10) return { gridColumn: 1, gridRow: 11 };
        if (index >= 11 && index <= 19) return { gridColumn: 1, gridRow: 21 - index };
        if (index === 20) return { gridColumn: 1, gridRow: 1 };
        if (index >= 21 && index <= 29) return { gridColumn: index - 19, gridRow: 1 };
        if (index === 30) return { gridColumn: 11, gridRow: 1 };
        if (index >= 31 && index <= 39) return { gridColumn: 11, gridRow: index - 29 };
        return {};
    };

    // Side orientation for rotation
    const getSide = (index) => {
        if (index >= 1 && index <= 9) return 'bottom';
        if (index >= 11 && index <= 19) return 'left';
        if (index >= 21 && index <= 29) return 'top';
        if (index >= 31 && index <= 39) return 'right';
        if (index === 0) return 'corner-go';
        if (index === 10) return 'corner-jail';
        if (index === 20) return 'corner-parking';
        if (index === 30) return 'corner-gotojail';
        return '';
    };

    // Icons for special spaces
    const getIcon = (space) => {
        if (space.type === 'corner') {
            if (space.id === 'go') return '➡️';
            if (space.id === 'jail') return '🔒';
            if (space.id === 'parking') return '🅿️';
            if (space.id === 'goto_jail') return '👮';
        }
        if (space.name?.includes('Chance')) return '❓';
        if (space.name?.includes('Community')) return '📦';
        if (space.name?.includes('Tax')) return '💰';
        if (space.group === 'station') return '🚂';
        if (space.type === 'utility') {
            if (space.name?.includes('Electric')) return '💡';
            if (space.name?.includes('Water')) return '🚿';
        }
        return null;
    };

    const currentProp = board[me?.position];
    const canBuy = currentProp && currentProp.price > 0 && !currentProp.owner && me?.money >= currentProp.price;

    return (
        <div className="game-wrapper">
            <div className="monopoly-board">
                {board.map((space, index) => {
                    const pos = getGridPosition(index);
                    const side = getSide(index);
                    const icon = getIcon(space);
                    const occupants = players.filter(p => p.position === index);
                    const isCorner = side.startsWith('corner');

                    return (
                        <div
                            key={space.id}
                            className={`space ${side}`}
                            style={pos}
                        >
                            {/* Color bar for properties */}
                            {space.group && !isCorner && (
                                <div className={`color-bar ${space.group}`}></div>
                            )}

                            <div className="space-content">
                                {/* Icon for special spaces */}
                                {icon && <span className="space-icon">{icon}</span>}

                                {/* Space name */}
                                <span className="space-name">{space.name}</span>

                                {/* Price */}
                                {space.price > 0 && (
                                    <span className="space-price">₹{space.price}</span>
                                )}
                            </div>

                            {/* Player tokens */}
                            {occupants.length > 0 && (
                                <div className="tokens">
                                    {occupants.map(p => (
                                        <img
                                            key={p.id}
                                            src={`/assets/pokemon/${p.pokemonId || 'mewtwo'}.png`}
                                            alt={p.name}
                                            className="token"
                                            title={p.name}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Owner indicator */}
                            {space.owner && (
                                <div
                                    className="owner-marker"
                                    style={{ background: players.find(p => p.id === space.owner)?.color }}
                                ></div>
                            )}
                        </div>
                    );
                })}

                {/* Center area */}
                <div className="board-center">
                    <div className="center-design">
                        <div className="logo-banner">
                            <span>MONOPOLY</span>
                        </div>
                        <div className="edition-text">INDIA EDITION</div>
                    </div>

                    <div className="game-controls">
                        <div className="turn-display">
                            {currentPlayer?.name}'s Turn
                            {currentPlayer?.inJail && <span className="jail-badge">🔒 IN JAIL</span>}
                        </div>

                        {isMyTurn && (
                            <div className="buttons">
                                {/* In Jail options */}
                                {me?.inJail && !hasRolled && (
                                    <>
                                        <button className="game-btn roll" onClick={handleRoll}>🎲 Roll for Doubles</button>
                                        <button className="game-btn buy" onClick={handlePayJailFine}>💰 Pay ₹50 Fine</button>
                                        {me.getOutOfJailCards > 0 && (
                                            <button className="game-btn end" onClick={handleUseJailCard}>🎫 Use Card</button>
                                        )}
                                    </>
                                )}

                                {/* Normal turn - not rolled yet */}
                                {!me?.inJail && !hasRolled && (
                                    <button className="game-btn roll" onClick={handleRoll}>🎲 ROLL DICE</button>
                                )}

                                {/* After rolling */}
                                {hasRolled && !auction && (
                                    <>
                                        {canRollAgain && (
                                            <button className="game-btn roll" onClick={handleRoll}>🎲 DOUBLES! Roll Again</button>
                                        )}
                                        {canBuy && (
                                            <>
                                                <button className="game-btn buy" onClick={handleBuy}>
                                                    🏠 BUY ₹{currentProp.price}
                                                </button>
                                                <button className="game-btn pass" onClick={handlePassProperty}>
                                                    🔨 AUCTION
                                                </button>
                                            </>
                                        )}
                                        {!canRollAgain && (
                                            <button className="game-btn end" onClick={handleEndTurn}>✓ END TURN</button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Auction UI */}
                        {auction && (
                            <div className="auction-panel">
                                <h3>🔨 AUCTION: {auction.propertyName}</h3>
                                <div className="current-bid">
                                    Current Bid: ₹{auction.currentBid}
                                    {auction.currentBidderName && ` by ${auction.currentBidderName}`}
                                </div>
                                <div className="bid-controls">
                                    <input
                                        type="number"
                                        value={bidAmount}
                                        onChange={(e) => setBidAmount(Math.max(auction.currentBid + 1, parseInt(e.target.value) || 0))}
                                        min={auction.currentBid + 1}
                                        max={me?.money || 0}
                                    />
                                    <button
                                        className="game-btn buy"
                                        onClick={handlePlaceBid}
                                        disabled={bidAmount <= auction.currentBid || bidAmount > me?.money}
                                    >
                                        💰 BID ₹{bidAmount}
                                    </button>
                                    <button className="game-btn pass" onClick={handlePassAuction}>
                                        ❌ PASS
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mini-log">
                            {logs.slice(-2).map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <div className="sidebar">
                <h2>🎮 Players</h2>
                {players.map((p, i) => (
                    <div key={p.id} className={`player-card ${p.id === currentTurn ? 'current' : ''}`}>
                        <img src={`/assets/pokemon/${p.pokemonId || 'mewtwo'}.png`} alt="" />
                        <div className="player-info">
                            <div className="name">{p.name} {p.id === myId && '(You)'}</div>
                            <div className="money">₹{p.money}</div>
                            <div className="props-count">
                                🏠 {board.filter(s => s.owner === p.id).length} properties
                            </div>
                        </div>
                        {p.id !== myId && (
                            <button
                                className="trade-btn"
                                onClick={() => setTradeTarget(p.id)}
                                title="Trade with this player"
                            >
                                🔄
                            </button>
                        )}
                    </div>
                ))}

                <h3>🏘️ Your Properties</h3>
                <div className="my-props">
                    {board.filter(s => s.owner === myId).map((s, idx) => {
                        const propIndex = board.findIndex(b => b.id === s.id);
                        const canBuild = checkMonopoly(s.group) && s.houses < 4 && !s.hasHotel;
                        const canBuildHotel = checkMonopoly(s.group) && s.houses === 4 && !s.hasHotel;
                        const housePrice = s.housePrice || Math.floor(s.price / 2);

                        return (
                            <div key={s.id} className={`prop-item ${s.group || ''}`}>
                                <span className="prop-name">{s.name}</span>
                                <span className="prop-buildings">
                                    {s.hasHotel ? '🏨' : '🏠'.repeat(s.houses)}
                                </span>
                                <div className="prop-actions">
                                    {canBuild && (
                                        <button onClick={() => handleBuildHouse(propIndex)} title={`Build house ₹${housePrice}`}>
                                            +🏠
                                        </button>
                                    )}
                                    {s.houses > 0 && !s.hasHotel && (
                                        <button onClick={() => handleSellHouse(propIndex)} title="Sell house">
                                            -🏠
                                        </button>
                                    )}
                                    {canBuildHotel && (
                                        <button onClick={() => handleBuyHotel(propIndex)} title={`Build hotel ₹${housePrice}`}>
                                            +🏨
                                        </button>
                                    )}
                                    {s.hasHotel && (
                                        <button onClick={() => handleSellHotel(propIndex)} title="Sell hotel">
                                            -🏨
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {board.filter(s => s.owner === myId).length === 0 && <em>None yet</em>}
                </div>

                {/* Trade Panel */}
                {tradeTarget && (
                    <div className="trade-panel">
                        <h3>🔄 Trade with {players.find(p => p.id === tradeTarget)?.name}</h3>
                        <div className="trade-section">
                            <label>You offer ₹:</label>
                            <input type="number" value={tradeOffer.money} onChange={e => setTradeOffer({ ...tradeOffer, money: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="trade-section">
                            <label>You request ₹:</label>
                            <input type="number" value={tradeOffer.requestMoney} onChange={e => setTradeOffer({ ...tradeOffer, requestMoney: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="trade-buttons">
                            <button onClick={handleSendTrade}>📤 Send Trade</button>
                            <button onClick={() => setTradeTarget(null)}>❌ Cancel</button>
                        </div>
                    </div>
                )}

                {/* Pending Trade (for receiver) */}
                {pendingTrade && pendingTrade.to === myId && (
                    <div className="trade-panel incoming">
                        <h3>📥 Trade from {pendingTrade.fromName}</h3>
                        <p>Offers: ₹{pendingTrade.offerMoney}</p>
                        <p>Wants: ₹{pendingTrade.requestMoney}</p>
                        <div className="trade-buttons">
                            <button onClick={handleAcceptTrade}>✅ Accept</button>
                            <button onClick={handleDeclineTrade}>❌ Decline</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
