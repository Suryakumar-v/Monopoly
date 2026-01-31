import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import './Board.css';

export default function Board({ gameData, myId, roomCode }) {
    const { players, board, currentTurn, logs } = gameData;
    const isMyTurn = currentTurn === myId;
    const me = players.find(p => p.id === myId);

    // State to track if current player has rolled this turn
    // In a real app, this should come from server state to persist refresh
    // For MVP, we'll try to infer or just use local state which resets on refresh (buggy but simple)
    // Better: listen for 'roll_completed' event
    const [hasRolled, setHasRolled] = useState(false);

    useEffect(() => {
        const onRollComplete = ({ playerId }) => {
            if (playerId === myId) setHasRolled(true);
        };

        // Reset local roll state when turn changes
        setHasRolled(false);

        socket.on('roll_completed', onRollComplete);
        return () => {
            socket.off('roll_completed', onRollComplete);
        };
    }, [currentTurn, myId]);

    const handleRoll = () => {
        socket.emit('roll_dice', { roomCode });
    };

    const handleEndTurn = () => {
        socket.emit('end_turn', { roomCode });
        setHasRolled(false);
    };

    // Helper to position spaces in CSS Grid
    const getPositionClass = (index) => {
        // Bottom Row: 0 (Right) -> 10 (Left)
        if (index === 0) return 'corner-bottom-right';
        if (index > 0 && index < 10) return `bottom-row pos-${index}`;
        if (index === 10) return 'corner-bottom-left';

        // Left Column: 11 (Bottom) -> 19 (Top)
        if (index > 10 && index < 20) return `left-col pos-${index}`;
        if (index === 20) return 'corner-top-left';

        // Top Row: 21 (Left) -> 29 (Right)
        if (index > 20 && index < 30) return `top-row pos-${index}`;
        if (index === 30) return 'corner-top-right';

        // Right Column: 31 (Top) -> 39 (Bottom)
        if (index > 30) return `right-col pos-${index}`;

        return '';
    };

    return (
        <div className="board-wrapper">
            <div className="monopoly-board">
                {/* Center - Stats & Controls */}
                <div className="board-center">
                    <div className="center-content">
                        <h1>MONOPOLY <span className="india-text">INDIA</span></h1>

                        <div className="turn-indicator">
                            <h2>{players.find(p => p.id === currentTurn)?.name}'s Turn</h2>
                        </div>

                        <div className="controls-area">
                            {isMyTurn && !hasRolled && (
                                <button className="roll-btn" onClick={handleRoll}>ROLL DICE</button>
                            )}
                            {isMyTurn && hasRolled && (
                                <button className="end-turn-btn" onClick={handleEndTurn}>END TURN</button>
                            )}
                        </div>

                        <div className="logs-area">
                            {logs.slice(-3).map((log, i) => (
                                <div key={i} className="log-entry">{log}</div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Spaces */}
                {board.map((prop, index) => {
                    const occupants = players.filter(p => p.position === index);

                    return (
                        <div key={prop.id} className={`space ${getPositionClass(index)} ${prop.group || prop.type}`}>
                            {prop.group && <div className={`color-bar ${prop.group}`}></div>}

                            <div className="space-content">
                                <div className="space-name">{prop.name}</div>
                                {prop.price > 0 && <div className="space-price">₹{prop.price}</div>}

                                <div className="player-tokens">
                                    {occupants.map(p => (
                                        <div key={p.id} className="token-container" title={p.name}>
                                            <img
                                                src={`/assets/pokemon/${p.pokemonId || 'mewtwo'}.png`}
                                                alt={p.name}
                                                className="token-img"
                                                style={{ borderColor: p.color }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Sidebar */}
            <div className="game-sidebar">
                <h3>Players</h3>
                {players.map(p => (
                    <div key={p.id} className={`player-card ${p.id === currentTurn ? 'active-turn' : ''}`}>
                        <div className="player-header">
                            <span className="p-name">{p.name}</span>
                            <span className="p-money">₹{p.money}</span>
                        </div>
                        <div className="player-img">
                            <img src={`/assets/pokemon/${p.pokemonId || 'mewtwo'}.png`} alt="pawn" width="30" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
