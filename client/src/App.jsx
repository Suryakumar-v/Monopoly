import React, { useEffect, useState } from 'react';
import { socket } from './services/socket';
import Lobby from './components/Lobby';
import Board from './components/Board';
import './App.css';

function App() {
    const [gameState, setGameState] = useState('LOBBY'); // LOBBY, WAITING, PLAYING
    const [roomCode, setRoomCode] = useState(null);
    const [playerName, setPlayerName] = useState('');
    const [gameData, setGameData] = useState(null);
    const [myId, setMyId] = useState(null);

    useEffect(() => {
        socket.on('connect', () => {
            setMyId(socket.id);
        });

        socket.on('room_created', ({ roomCode }) => {
            setRoomCode(roomCode);
            setGameState('WAITING');
        });

        socket.on('joined_room', ({ roomCode }) => {
            setRoomCode(roomCode);
            setGameState('WAITING');
        });

        socket.on('game_started', () => {
            setGameState('PLAYING');
        });

        socket.on('game_state', (data) => {
            setGameData(data);
        });

        socket.on('error', (msg) => {
            alert(msg);
        });

        return () => {
            socket.off('connect');
            socket.off('room_created');
            socket.off('joined_room');
            socket.off('game_started');
            socket.off('game_state');
        };
    }, []);

    const startGame = () => {
        socket.emit('start_game', { roomCode });
    };

    if (gameState === 'LOBBY') {
        return <Lobby onJoin={setPlayerName} />;
    }

    if (gameState === 'WAITING') {
        const isHost = gameData?.players.find(p => p.id === myId)?.isHost;

        const startTestGame = () => {
            socket.emit('start_test_game', { roomCode });
        };

        return (
            <div className="waiting-room">
                <h2>Room Code: {roomCode}</h2>
                <p>Share this code with your friends!</p>
                <div className="player-list">
                    <h3>Players Joined:</h3>
                    <ul>
                        {gameData?.players.map(p => <li key={p.id}>{p.name} {p.isHost ? '(Host)' : ''}</li>)}
                    </ul>
                </div>
                {isHost && (
                    <div className="host-controls">
                        <button className="start-btn" onClick={startGame} disabled={gameData?.players.length < 2}>
                            Start Game ({gameData?.players.length}/2+ players)
                        </button>
                        <button className="test-btn" onClick={startTestGame} style={{ marginTop: '10px', background: '#ff9800' }}>
                            🧪 Test Mode (Solo Play)
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="game-container">
            {gameData && <Board gameData={gameData} myId={myId} roomCode={roomCode} />}
        </div>
    );
}

export default App;
