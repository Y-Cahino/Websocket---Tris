const WebSocket = require('ws');
const mysql = require("mysql2");

const wss = new WebSocket.Server({ port: 8080 });

const db = mysql.createConnection({
    host: "localhost",
    user: 'user',
    password: '',
    database: 'tris_db'
});

let lobbies = {}; // Lobby dinamiche

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {

                case 'showLobby':
                    // Mostra tutte le lobby con nome e gioco
                    const list = Object.entries(lobbies).map(([name, info]) => ({
                        name,
                        game: info.gameName
                    }));
                    ws.send(JSON.stringify({ type: 'lobbies', lobbies: list }));
                    break;

                case 'create_lobby':
                    if (!lobbies[data.lobby]) {
                        const gameName = data.gameName || 'generico';

                        lobbies[data.lobby] = {
                            players: [],
                            gameName: gameName,
                            state: {},      // Stato del gioco gestito dal client
                            turn: 'X'
                        };

                        ws.playerSymbol = 'X';
                        lobbies[data.lobby].players.push(ws);
                        ws.lobby = data.lobby;

                        ws.send(JSON.stringify({
                            type: 'lobby_created',
                            lobby: data.lobby,
                            symbol: 'X',
                            gameName
                        }));
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Lobby già esistente' }));
                    }
                    break;

                case 'join_lobby':
                    const lobby = lobbies[data.lobby];
                    if (lobby && lobby.players.length < 2) {
                        ws.playerSymbol = 'O';
                        lobby.players.push(ws);
                        ws.lobby = data.lobby;

                        ws.send(JSON.stringify({
                            type: 'lobby_joined',
                            lobby: data.lobby,
                            symbol: 'O',
                            state: lobby.state,
                            turn: lobby.turn,
                            gameName: lobby.gameName
                        }));

                        // Notifica l'altro giocatore
                        lobby.players[0].send(JSON.stringify({ type: 'player_joined' }));
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Lobby piena o inesistente' }));
                    }
                    break;

                case 'move':
                    if (ws.lobby && lobbies[ws.lobby]) {
                        const lobby = lobbies[ws.lobby];
                        // La logica del gioco viene gestita lato client: il server fa da ponte
                        lobby.state = data.state; // aggiorna stato inviato dal client
                        lobby.turn = data.turn;

                        lobby.players.forEach(player => {
                            if (player.readyState === WebSocket.OPEN) {
                                player.send(JSON.stringify({
                                    type: 'move',
                                    state: lobby.state,
                                    turn: lobby.turn,
                                    symbol: ws.playerSymbol
                                }));
                            }
                        });
                    }
                    break;

                case 'chat':
                    if (ws.lobby && lobbies[ws.lobby]) {
                        lobbies[ws.lobby].players.forEach(player => {
                            if (player.readyState === WebSocket.OPEN) {
                                player.send(JSON.stringify({
                                    type: 'chat',
                                    message: data.message,
                                    sender: ws.playerSymbol
                                }));
                            }
                        });
                    }
                    break;

                case 'search_lobby':
                    db.query('SELECT * FROM lobbies WHERE nome = ?', [data.lobby], (err, results) => {
                        if (err) {
                            ws.send(JSON.stringify({ type: 'error', message: 'Errore DB' }));
                        } else {
                            ws.send(JSON.stringify({
                                type: 'lobby_search_result',
                                exists: results.length > 0
                            }));
                        }
                    });
                    break;

                default:
                    ws.send(JSON.stringify({ type: 'error', message: 'Tipo messaggio sconosciuto' }));
            }

        } catch (err) {
            ws.send(JSON.stringify({ type: 'error', message: 'JSON non valido' }));
        }
    });

    ws.on('close', () => {
        if (ws.lobby && lobbies[ws.lobby]) {
            const lobby = lobbies[ws.lobby];
            lobby.players = lobby.players.filter(p => p !== ws);

            if (lobby.players.length === 0) {
                delete lobbies[ws.lobby];
            }
        }
    });
});

console.log('WebSocket server attivo su ws://localhost:8080');