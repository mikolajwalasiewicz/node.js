const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = {}; // Store player data by socket ID

app.use(express.static('public'));

// Handle player connection
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Handle player joining the game and setting their name
    socket.on('joinGame', (data) => {
        players[socket.id] = { name: data.name, board: [], shipsRemaining: 10, ready: false };
        
        // Broadcast player data to all clients
        io.emit('updatePlayers', players);
    });

    // Handle ship placement
    socket.on('placeShip', (data) => {
        if (players[socket.id]) {
            players[socket.id].board = data.board;
            players[socket.id].ready = true;
            io.emit('updatePlayers', players); // Update ship placement for all clients

            // Check if both players are ready, start battle phase
            if (Object.keys(players).length === 2 && Object.values(players).every(player => player.ready)) {
                io.emit('startBattle');
            }
        } else {
            console.log('Error: Player not found for socket ID:', socket.id);
        }
    });

    // Handle player attacks
    socket.on('attack', (data) => {
        const opponentId = Object.keys(players).find(id => id !== socket.id);
        if (!opponentId) return;

        const opponentBoard = players[opponentId].board;
        const hit = opponentBoard[data.row][data.col] === 'ship';

        if (hit) {
            opponentBoard[data.row][data.col] = 'hit';
            players[opponentId].shipsRemaining--;
        } else {
            opponentBoard[data.row][data.col] = 'miss';
        }

        io.emit('attackResult', { row: data.row, col: data.col, hit, attacker: players[socket.id].name });
        io.emit('updatePlayers', players);

        if (players[opponentId].shipsRemaining === 0) {
            io.emit('gameOver', { winner: players[socket.id].name });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});


server.listen(3000, () => {
    console.log('Server running on port 3000');
});