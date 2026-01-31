import React from 'react';
import { socket } from '../services/socket';
import './Board.css';

export default function Board({ gameData, myId, roomCode }) {
    const { players, board, currentTurn, logs } = gameData;
    const isMyTurn = currentTurn === myId;
    const me = players.find(p => p.id === myId);

    const handleRoll = () => {
        socket.emit('roll_dice', { roomCode });
    };

    const handleBuy = () => {
        socket.emit('buy_property', { roomCode });
    };

    // Helper to check who is on a tile
    const getPlayersOnTile = (index) => {
        return players.filter(p => p.position === index);
    };

    // Helper to get property color class
    const getGroupColor = (group) => {
        const colors = {
            brown: '#8B4513',
            light_blue: '#87CEEB',
            pink: '#FFC0CB',
            orange: '#FFA500',
            red: '#FF0000',
            yellow: '#FFD700',
            green: '#008000',
            dark_blue: '#00008B'
        };
        return colors[group] || '#ccc';
    };

    return (
        <div className="board-layout">
            <div className="main-board">
                {/* Visualizing Board as a simple grid or list for MVP */}
                {/* A true monopoly board is a square loop. For simplicity, we'll render a flex wrap list 
                    but verifying "Indian Cities" theme. */}
                <div className="tiles-container">
                    {board.map((prop, index) => {
                        const owners = players.filter(p => p.id === prop.owner);
                        const occupants = getPlayersOnTile(index);

                        return (
                            <div key={prop.id} className="tile" style={{ borderColor: getGroupColor(prop.group) }}>
                                <div className="color-strip" style={{ backgroundColor: getGroupColor(prop.group) }}></div>
                                <div className="tile-name">{prop.name}</div>
                                <div className="tile-price">${prop.price}</div>

                                {prop.owner && (
                                    <div className="owner-badge" style={{ backgroundColor: owners[0]?.color }}>
                                        Owned
                                    </div>
                                )}

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
                        );
                    })}
                </div>
            </div>

            <div className="sidebar">
                <div className="status-panel">
                    <h2>Current Turn: {players.find(p => p.id === currentTurn)?.name}</h2>
                    {isMyTurn && (
                        <div className="controls">
                            <button className="action-btn" onClick={handleRoll}>🎲 Roll Dice</button>
                            {/* Show Buy button if on unowned property */}
                            {(() => {
                                const currentProp = board[me.position];
                                if (currentProp && !currentProp.owner && me.money >= currentProp.price) {
                                    return <button className="buy-btn" onClick={handleBuy}>Buy {currentProp.name} (${currentProp.price})</button>
                                }
                            })()}
                        </div>
                    )}
                </div>

                <div className="players-panel">
                    <h3>Players</h3>
                    {players.map(p => (
                        <div key={p.id} className={`player-card ${p.id === currentTurn ? 'active-turn' : ''}`} style={{ borderLeft: `5px solid ${p.color}` }}>
                            <div className="p-name">{p.name} {p.id === myId ? '(You)' : ''}</div>
                            <div className="p-money">${p.money}</div>
                        </div>
                    ))}
                </div>

                <div className="logs-panel">
                    <h3>Game Log</h3>
                    <div className="logs-list">
                        {logs.slice().reverse().map((log, i) => (
                            <div key={i} className="log-entry">{log}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
