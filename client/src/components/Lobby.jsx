import React, { useState } from 'react';
import { socket } from '../services/socket';
import './Lobby.css';

export default function Lobby({ onJoin }) {
    const [selectedPokemon, setSelectedPokemon] = useState('mewtwo');
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');

    const pokemons = [
        { id: 'mewtwo', name: 'Mewtwo', img: '/assets/pokemon/mewtwo.png' },
        { id: 'rayquaza', name: 'Rayquaza', img: '/assets/pokemon/rayquaza.png' },
        { id: 'groudon', name: 'Groudon', img: '/assets/pokemon/groudon.png' },
        { id: 'kyogre', name: 'Kyogre', img: '/assets/pokemon/kyogre.png' },
        { id: 'arceus', name: 'Arceus', img: '/assets/pokemon/arceus.png' },
        { id: 'giratina', name: 'Giratina', img: '/assets/pokemon/giratina.png' },
    ];

    const handleCreate = () => {
        if (!name) return setError('Please enter your name');
        socket.emit('create_room', { playerName: name, pokemonId: selectedPokemon });
        onJoin(name);
    };

    const handleJoin = () => {
        if (!name || !roomCode) return setError('Please enter name and room code');
        socket.emit('join_room', { roomCode, playerName: name, pokemonId: selectedPokemon });
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

                <div className="pokemon-selection">
                    <h3>Choose Your Pokemon</h3>
                    <div className="pokemon-grid">
                        {pokemons.map(p => (
                            <div
                                key={p.id}
                                className={`pokemon-option ${selectedPokemon === p.id ? 'selected' : ''}`}
                                onClick={() => setSelectedPokemon(p.id)}
                            >
                                <img src={p.img} alt={p.name} />
                                <span>{p.name}</span>
                            </div>
                        ))}
                    </div>
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

        </div>
    );
}
