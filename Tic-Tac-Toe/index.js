const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Game state variables
let board = Array(9).fill(null);
let currentPlayer = 'X'; // 'X' starts the game by default
let players = {}; // Map of socket IDs to player marks ('X' or 'O')
let winTracker = { X: 0, O: 0 }; // Track wins for X and O
let starter = 'X'; // Track who should start the game (alternates after each game)

// Winning combinations for Tic-Tac-Toe
const winningCombinations = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Function to check for a win and return the winning combination
function checkWin() {
  for (let combination of winningCombinations) {
    const [a, b, c] = combination;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return combination; // Return the winning combination
    }
  }
  return null; // No winner
}

// Reset the game board and alternate the starter
function resetGame() {
  board = Array(9).fill(null);
  currentPlayer = starter; // Set currentPlayer to whoever should start the game
  starter = starter === 'X' ? 'O' : 'X'; // Alternate the starter for the next game
}

io.on('connection', (socket) => {
  console.log('A player connected:', socket.id);

  // Assign 'X' to the first player and 'O' to the second
  if (Object.keys(players).length === 0) {
    players[socket.id] = 'X';
    socket.emit('mark', { mark: 'X' }); // Inform player of their mark
  } else if (Object.keys(players).length === 1) {
    players[socket.id] = 'O';
    socket.emit('mark', { mark: 'O' }); // Inform player of their mark
  } else {
    socket.emit('full'); // If two players are already connected, block new connections
    return;
  }

  // Send the current game state to the new player
  socket.emit('board', { board, currentPlayer, winTracker });

  // Handle a move from the player
  socket.on('move', (data) => {
    const { index } = data;

    // Only allow the current player's move
    if (board[index] === null && currentPlayer === players[socket.id]) {
      board[index] = players[socket.id];

      // Check if the current player wins
      const winningCombination = checkWin();
      if (winningCombination) {
        winTracker[players[socket.id]] += 1; // Increment win count for the winning player
        io.emit('win', { winner: players[socket.id], winTracker, winningCombination }); // Broadcast the win with the winning combination

        // Delay game reset to allow confetti and animations to play
        setTimeout(() => {
          resetGame(); // Reset the board after 3 seconds
          io.emit('board', { board, currentPlayer, winTracker }); // Send the new board and win count
        }, 3000); // 3 second delay before resetting the game
      } else if (board.every(cell => cell !== null)) {
        io.emit('draw'); // It's a draw
        resetGame(); // Reset the board after a draw
        io.emit('board', { board, currentPlayer, winTracker });
      } else {
        // Switch to the other player's turn
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        io.emit('board', { board, currentPlayer, winTracker }); // Send the updated board and win count
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('A player disconnected:', socket.id);
    delete players[socket.id]; // Remove player on disconnect
    resetGame(); // Reset the game if a player leaves
    io.emit('board', { board, currentPlayer, winTracker });
  });
});

// Serve the static files from 'public'
app.use(express.static('public'));

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
