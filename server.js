const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let lobbies = {}; // Ogni lobby è una chiave con un array di giocatori e stato del gioco

wss.on('connection', (ws) => {
            ws.on('message', (message) => {
                console.log('a user connected');
                try {
                    const data = JSON.parse(message);

                    switch (data.type) {
                        case 'showLobby':
                            ws.send(JSON.stringify({ type: 'lobbies', lobbies: Object.keys(lobbies) }));
                            break;
                        case 'create_lobby':
                            if (!lobbies[data.lobby]) {
                                lobbies[data.lobby] = { players: [], board: Array(9).fill(null), turn: 'X' };
                                ws.playerSymbol = 'X';
                                lobbies[data.lobby].players.push(ws);
                                ws.lobby = data.lobby;
                                ws.send(JSON.stringify({ type: 'lobby_created', lobby: data.lobby, symbol: 'X' }));
                            } else {
                                ws.send(JSON.stringify({ type: 'error', message: 'Lobby already exists' }));
                            }
                            break;
                        case 'search_lobby':
                            if (lobbiues[data.lobby]) {
                                ws.send(JSON.stringify({
                                            type: 'searchLobbies',
                                            lobby: data.lobby,

                                        )
                                    }
                                    case 'join_lobby':
                                        if (lobbies[data.lobby] && lobbies[data.lobby].players.length < 2) {
                                            ws.playerSymbol = 'O';
                                            lobbies[data.lobby].players.push(ws);
                                            ws.lobby = data.lobby;
                                            ws.send(JSON.stringify({
                                                type: 'lobby_joined',
                                                lobby: data.lobby,
                                                symbol: 'O',
                                                board: lobbies[data.lobby].board,
                                                turn: lobbies[data.lobby].turn
                                            }));

                                            // Notifica il primo giocatore che l'avversario si è unito
                                            lobbies[data.lobby].players[0].send(JSON.stringify({ type: 'player_joined' }));
                                        } else {
                                            ws.send(JSON.stringify({ type: 'error', message: 'Lobby is full or does not exist' }));
                                        }
                                        break;

                                    case 'move':
                                        if (ws.lobby && lobbies[ws.lobby]) {
                                            let game = lobbies[ws.lobby];
                                            if (game.turn === ws.playerSymbol && game.board[data.move.index] === null) {
                                                game.board[data.move.index] = ws.playerSymbol;
                                                game.turn = game.turn === 'X' ? 'O' : 'X';

                                                // Invia la mossa a entrambi i giocatori
                                                game.players.forEach(player => {
                                                    if (player.readyState === WebSocket.OPEN) {
                                                        player.send(JSON.stringify({
                                                            type: 'move',
                                                            move: { index: data.move.index, symbol: ws.playerSymbol },
                                                            turn: game.turn
                                                        }));
                                                    }
                                                });
                                            }
                                        }
                                        break;
                                }
                            } catch (error) {
                                ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
                            }
                    });

                function chatMessage(lobby, message) {
                    if (lobbies[lobby]) {
                        lobbies[lobby].players.forEach(player => {
                            if (player.readyState === WebSocket.OPEN) {
                                player.send(JSON.stringify({ type: 'chat', message }));
                            }
                        });
                    }
                }

                ws.on('close', () => {
                    if (ws.lobby && lobbies[ws.lobby]) {
                        lobbies[ws.lobby].players = lobbies[ws.lobby].players.filter(player => player !== ws);
                        if (lobbies[ws.lobby].players.length === 0) {
                            delete lobbies[ws.lobby];
                        }
                    }
                });
            });

            console.log('WebSocket server started on ws://localhost:8080');