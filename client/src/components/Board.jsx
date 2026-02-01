import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import './Board.css';

export default function Board({ gameData, myId, roomCode }) {
    const { players, board, currentTurn, logs } = gameData;
    const isMyTurn = players[currentTurn]?.id === myId;
    const me = players.find(p => p.id === myId);

    const [hasRolled, setHasRolled] = useState(false);

    useEffect(() => {
        const onRollComplete = ({ playerId }) => {
            if (playerId === myId) setHasRolled(true);
        };
        setHasRolled(false);
        socket.on('roll_completed', onRollComplete);
        return () => socket.off('roll_completed', onRollComplete);
    }, [currentTurn, myId]);

    const handleRoll = () => socket.emit('roll_dice', { roomCode });
    const handleEndTurn = () => { socket.emit('end_turn', { roomCode }); setHasRolled(false); };
    const handleBuy = () => socket.emit('buy_property', { roomCode });

    // Position mapping for CSS Grid
    const getGridPosition = (index) => {
        // Bottom row: index 0 (GO) at column 11, moving left to index 10 (Jail) at column 1
        if (index === 0) return { gridColumn: 11, gridRow: 11 };
        if (index >= 1 && index <= 9) return { gridColumn: 11 - index, gridRow: 11 };
        if (index === 10) return { gridColumn: 1, gridRow: 11 };

        // Left column: index 11-19, going up from row 10 to row 2
        if (index >= 11 && index <= 19) return { gridColumn: 1, gridRow: 21 - index };
        if (index === 20) return { gridColumn: 1, gridRow: 1 };

        // Top row: index 21-29, going right from column 2 to column 10
        if (index >= 21 && index <= 29) return { gridColumn: index - 19, gridRow: 1 };
        if (index === 30) return { gridColumn: 11, gridRow: 1 };

        // Right column: index 31-39, going down from row 2 to row 10
        if (index >= 31 && index <= 39) return { gridColumn: 11, gridRow: index - 29 };

        return {};
    };

    // Get orientation for color bar placement
    const getOrientation = (index) => {
        if (index >= 1 && index <= 9) return 'bottom'; // color bar on top
        if (index >= 11 && index <= 19) return 'left'; // color bar on right
        if (index >= 21 && index <= 29) return 'top'; // color bar on bottom
        if (index >= 31 && index <= 39) return 'right'; // color bar on left
        return 'corner';
    };

    const currentProp = board[me?.position];
    const canBuy = currentProp && currentProp.price > 0 && !currentProp.owner && me?.money >= currentProp.price;

    return (
        <div className="game-wrapper">
            <div className="monopoly-board">
                {/* Render all 40 spaces */}
                {board.map((space, index) => {
                    const pos = getGridPosition(index);
                    const orientation = getOrientation(index);
                    const occupants = players.filter(p => p.position === index);
                    const isCorner = [0, 10, 20, 30].includes(index);

                    return (
                        <div
                            key={space.id}
                            className={`space ${orientation} ${isCorner ? 'corner' : ''}`}
                            style={pos}
                        >
                            {/* Color bar for properties */}
                            {space.group && (
                                <div className={`color-bar ${space.group}`}></div>
                            )}

                            <div className="space-info">
                                <span className="space-name">{space.name}</span>
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
                                    className="owner-dot"
                                    style={{ background: players.find(p => p.id === space.owner)?.color }}
                                ></div>
                            )}
                        </div>
                    );
                })}

                {/* Center area */}
                <div className="board-center">
                    <div className="center-logo">
                        <span className="logo-text">MONOPOLY</span>
                        <span className="logo-subtitle">INDIA EDITION</span>
                    </div>

                    <div className="turn-info">
                        <strong>{players[currentTurn]?.name}'s Turn</strong>
                    </div>

                    {isMyTurn && (
                        <div className="action-buttons">
                            {!hasRolled ? (
                                <button className="btn roll-btn" onClick={handleRoll}>🎲 ROLL DICE</button>
                            ) : (
                                <>
                                    {canBuy && (
                                        <button className="btn buy-btn" onClick={handleBuy}>
                                            🏠 Buy {currentProp.name} (₹{currentProp.price})
                                        </button>
                                    )}
                                    <button className="btn end-btn" onClick={handleEndTurn}>✓ END TURN</button>
                                </>
                            )}
                        </div>
                    )}

                    <div className="game-log">
                        {logs.slice(-3).map((log, i) => (
                            <div key={i} className="log-item">{log}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <div className="sidebar">
                <h2>Players</h2>
                {players.map((p, i) => (
                    <div key={p.id} className={`player-info ${i === currentTurn ? 'active' : ''}`}>
                        <img src={`/assets/pokemon/${p.pokemonId || 'mewtwo'}.png`} alt="" className="player-pawn" />
                        <div className="player-details">
                            <span className="player-name">{p.name} {p.id === myId ? '(You)' : ''}</span>
                            <span className="player-money">₹{p.money}</span>
                        </div>
                    </div>
                ))}

                <h3>Your Properties</h3>
                <div className="my-properties">
                    {board.filter(s => s.owner === myId).map(s => (
                        <div key={s.id} className={`prop-chip ${s.group}`}>{s.name}</div>
                    ))}
                    {board.filter(s => s.owner === myId).length === 0 && (
                        <p className="no-props">None yet</p>
                    )}
                </div>
            </div>
        </div>
    );
}
