import React, { useState } from 'react';
import { socket } from '../services/socket';

export default function Lobby({ onJoin }) {
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');

    const handleCreate = () => {
        if (!name) return setError('Please enter your name');
        socket.emit('create_room', { playerName: name });
        onJoin(name);
    };

    const handleJoin = () => {
        if (!name || !roomCode) return setError('Please enter name and room code');
        socket.emit('join_room', { roomCode, playerName: name });
        onJoin(name);
    };

    return (
        <div className="lobby-container">
            <h1>Monopoly India</h1>

            <div className="card">
                <div className="input-group">
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                <div className="actions">
                    <div className="section">
                        <h3>Create New Game</h3>
                        <button onClick={handleCreate}>Create Room</button>
                    </div>

                    <div className="divider">OR</div>

                    <div className="section">
                        <h3>Join Friend</h3>
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="Room Code"
                                value={roomCode}
                                onChange={e => setRoomCode(e.target.value)}
                            />
                            <button onClick={handleJoin}>Join</button>
                        </div>
                    </div>
                </div>
                {error && <p className="error">{error}</p>}
            </div>

            <style jsx>{`
                .lobby-container {
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                .card {
                    background: #333;
                    padding: 2rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .section { margin: 1rem 0; }
                .divider { margin: 1rem 0; font-weight: bold; color: #888; }
                .error { color: #ff6b6b; }
                
                button {
                    background: #4cc9f0;
                    color: #000;
                    border: none;
                    padding: 0.8rem 1.5rem;
                    border-radius: 4px;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: all 0.2s;
                    width: 100%;
                    margin-top: 0.5rem;
                }
                button:hover {
                    background: #480ca8;
                    color: #fff;
                    transform: translateY(-2px);
                }
                input {
                    padding: 0.8rem;
                    border-radius: 4px;
                    border: 1px solid #555;
                    background: #444;
                    color: white;
                    width: 100%;
                    box-sizing: border-box;
                }
            `}</style>
        </div>
    );
}
