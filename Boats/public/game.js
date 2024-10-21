const socket = io();
let isHorizontal = true;  // Default orientation for placing ships
let playerBoard = Array(10).fill().map(() => Array(10).fill(null));  // Player's own ship board
let opponentBoard = Array(10).fill().map(() => Array(10).fill(null));  // Opponent's board for attacking
let playerName = '';
let playerTurn = false;  // Track whose turn it is
let playerData = {};  // Store player data
let currentShipIndex = 0;  // Track which ship is being placed

// Define the ships for each player
const shipsToPlace = [
    { size: 4, count: 1 },
    { size: 3, count: 2 },
    { size: 2, count: 3 },
    { size: 1, count: 4 }
];

// Function to join the game and set player name
function joinGame() {
    playerName = document.getElementById('player-name').value;
    if (!playerName) return alert('Please enter your name!');

    socket.emit('joinGame', { name: playerName });
    document.getElementById('name-container').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    // Create both boards: one for placing ships, one for attacking the opponent's ships
    createBoard('ship-board', playerBoard, placeShip);  // Create ship placement board
    createBoard('opponent-board', opponentBoard, attackCell);  // Create opponent attack board
}

// Listen for player updates from the server
socket.on('updatePlayers', (players) => {
    playerData = players;
    updatePlayerTable(players);
});

// Update the player table dynamically based on both players' names
function updatePlayerTable(players) {
    const playerList = Object.values(players);

    if (playerList.length >= 1) {
        document.getElementById('player1-name').innerText = playerList[0].name;
    }

    if (playerList.length >= 2) {
        document.getElementById('player2-name').innerText = playerList[1].name;
    }
}

// Function to place a ship on the board
function placeShip(cell) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const currentShip = shipsToPlace[currentShipIndex];

    if (canPlaceShip(row, col, currentShip.size, isHorizontal, playerBoard)) {
        placeShipOnBoard(row, col, currentShip.size, isHorizontal, playerBoard);

        currentShip.count--;
        if (currentShip.count === 0) {
            currentShipIndex++;  // Move to the next ship type once the current type is placed
        }

        if (currentShipIndex >= shipsToPlace.length) {
            socket.emit('placeShip', { board: playerBoard });
            document.getElementById('rotate-button').style.display = 'none';
            document.getElementById('turn-indicator').innerText = 'Waiting for the other player to place their ships...';
        }
    }
}

// Function to validate ship placement
function canPlaceShip(row, col, length, isHorizontal, board) {
    if (isHorizontal && col + length > 10) return false;
    if (!isHorizontal && row + length > 10) return false;

    // Check surrounding cells for 1-cell distance
    for (let i = -1; i <= length; i++) {  
        for (let j = -1; j <= 1; j++) {    
            const checkRow = isHorizontal ? row + j : row + i;
            const checkCol = isHorizontal ? col + i : col + j;

            if (checkRow >= 0 && checkRow < 10 && checkCol >= 0 && checkCol < 10) {
                if (board[checkRow][checkCol] === 'ship') {
                    return false;  // Another ship is too close
                }
            }
        }
    }

    for (let i = 0; i < length; i++) {
        const shipRow = isHorizontal ? row : row + i;
        const shipCol = isHorizontal ? col + i : col;
        if (board[shipRow][shipCol] === 'ship') {
            return false;
        }
    }

    return true;
}

// Function to place the ship on the board
function placeShipOnBoard(row, col, length, isHorizontal, board) {
    for (let i = 0; i < length; i++) {
        const shipRow = isHorizontal ? row : row + i;
        const shipCol = isHorizontal ? col + i : col;
        board[shipRow][shipCol] = 'ship';
        const cell = document.querySelector(`#ship-board .cell[data-row="${shipRow}"][data-col="${shipCol}"]`);
        cell.classList.add('ship');
    }
}

// Rotate ship orientation
function rotateShip() {
    isHorizontal = !isHorizontal;
    document.getElementById('rotate-button').innerText = isHorizontal ? 'Rotate Ship (Horizontal)' : 'Rotate Ship (Vertical)';
}

// Start battle after both players place ships
socket.on('startBattle', () => {
    document.getElementById('turn-indicator').innerText = 'It’s your turn to attack!';
    playerTurn = true;  // Let the first player attack first
});

// Function to attack the opponent's ships
function attackCell(cell) {
    if (!playerTurn) return;  // Only allow attack if it's the player's turn

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    socket.emit('attack', { row, col });
    playerTurn = false;
    document.getElementById('turn-indicator').innerText = 'Waiting for opponent...';
}

// Handle attack results and update both boards correctly
socket.on('attackResult', (data) => {
    const opponentAttackCell = document.querySelector(`#opponent-board .cell[data-row='${data.row}'][data-col='${data.col}']`);
    const playerDefenderCell = document.querySelector(`#ship-board .cell[data-row='${data.row}'][data-col='${data.col}']`);

    // If this player is the attacker, update their strike board (opponent's board)
    if (data.attacker === playerName) {
        if (data.hit) {
            opponentAttackCell.classList.add('hit');
            opponentAttackCell.style.backgroundColor = 'red';  // Mark hit
            const sunk = checkIfSunk(opponentBoard, data.shipCells, data.isHorizontal);
            if (sunk) {
                updateShipTable(data.defender, data.shipSize);  // Update table for sunk ship
            }
        } else {
            opponentAttackCell.classList.add('miss');
            opponentAttackCell.style.backgroundColor = 'gray'; // Mark miss
        }
    } else {
        // If this player is the defender, update their own ship board
        if (data.hit) {
            playerDefenderCell.classList.add('hit');
            playerDefenderCell.style.backgroundColor = 'red';  // Mark hit on defender's board
        } else {
            playerDefenderCell.classList.add('miss');
            playerDefenderCell.style.backgroundColor = 'gray';  // Mark miss on defender's board
        }
    }

    // Alternate turns
    if (data.attacker !== playerName) {
        document.getElementById('turn-indicator').innerText = "It's your turn to attack!";
        playerTurn = true;
    }
});


// Handle game over
socket.on('gameOver', (data) => {
    document.getElementById('turn-indicator').innerText = `${data.winner} wins the game!`;
});

// Create a 10x10 grid for the game board
function createBoard(boardId, boardData, clickHandler) {
    const boardElement = document.getElementById(boardId);
    boardElement.innerHTML = '';  // Clear any previous content in the board

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', () => clickHandler(cell));

            boardElement.appendChild(cell);
        }
    }
}
// Function to create hover effect
function highlightCells(cell, length, isHorizontal, action) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (isHorizontal) {
        if (col + length <= 10) {
            for (let i = 0; i < length; i++) {
                const targetCell = document.querySelector(`#ship-board .cell[data-row="${row}"][data-col="${col + i}"]`);
                if (targetCell) {
                    if (action === 'add') {
                        targetCell.classList.add('hover-ship');  // Add hover effect
                    } else {
                        targetCell.classList.remove('hover-ship');  // Remove hover effect
                    }
                }
            }
        }
    } else {
        if (row + length <= 10) {
            for (let i = 0; i < length; i++) {
                const targetCell = document.querySelector(`#ship-board .cell[data-row="${row + i}"][data-col="${col}"]`);
                if (targetCell) {
                    if (action === 'add') {
                        targetCell.classList.add('hover-ship');  // Add hover effect
                    } else {
                        targetCell.classList.remove('hover-ship');  // Remove hover effect
                    }
                }
            }
        }
    }
}

// Modify the createBoard function to add hover listeners
function createBoard(boardId, boardData, clickHandler) {
    const boardElement = document.getElementById(boardId);
    boardElement.innerHTML = '';  // Clear any previous content in the board

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;

            // Add event listeners to handle ship placement or attack
            if (boardId === 'ship-board') {
                // Highlight cells on hover for ship placement
                cell.addEventListener('mouseover', () => highlightCells(cell, shipsToPlace[currentShipIndex].size, isHorizontal, 'add'));
                cell.addEventListener('mouseout', () => highlightCells(cell, shipsToPlace[currentShipIndex].size, isHorizontal, 'remove'));

                // Add click event to place the ship
                cell.addEventListener('click', () => clickHandler(cell));
            } else if (boardId === 'opponent-board') {
                // Add click event for attack
                cell.addEventListener('click', () => clickHandler(cell));
            }

            boardElement.appendChild(cell);
        }
    }
}
// Function to update the ship table when a ship is sunk
function updateShipTable(defender, shipSize) {
    let playerRow;
    if (defender === playerName) {
        // If the current player is the defender, update their table row
        playerRow = (playerName === 'Player 1') ? 'player1' : 'player2';
    } else {
        // If the opponent is the defender, update their table row
        playerRow = (playerName === 'Player 1') ? 'player2' : 'player1';
    }

    const shipElement = document.getElementById(`${playerRow}-ship-${shipSize}`);
    let shipCount = parseInt(shipElement.innerText);
    if (shipCount > 0) {
        shipElement.innerText = shipCount - 1;  // Decrement ship count
    }
}

function checkIfSunk(board, shipCells, isHorizontal) {
    // Check if the ship has been completely hit
    for (let i = 0; i < shipCells.length; i++) {
        if (board[shipCells[i].row][shipCells[i].col] !== 'hit') {
            return false;  // Ship is not sunk
        }
    }
    
    // If we reach here, the ship is sunk; now mark surrounding cells
    markSurroundingCells(board, shipCells, isHorizontal);
    return true;  // Ship is sunk
}

function markSurroundingCells(board, shipCells, isHorizontal) {
    const surroundingOffsets = [-1, 0, 1];  // Check surrounding areas
    shipCells.forEach(cell => {
        const { row, col } = cell;
        for (let i = 0; i < surroundingOffsets.length; i++) {
            for (let j = 0; j < surroundingOffsets.length; j++) {
                const checkRow = row + surroundingOffsets[i];
                const checkCol = col + surroundingOffsets[j];
                if (checkRow >= 0 && checkRow < 10 && checkCol >= 0 && checkCol < 10) {
                    if (board[checkRow][checkCol] === null) {  // Empty cell
                        board[checkRow][checkCol] = 'miss';
                        const cellElement = document.querySelector(`#opponent-board .cell[data-row="${checkRow}"][data-col="${checkCol}"]`);
                        cellElement.classList.add('miss');
                    }
                }
            }
        }
    });
}


// Call this when ships are being placed
createBoard('ship-board', playerBoard, placeShip);

// Call this for the attack board
createBoard('opponent-board', opponentBoard, attackCell);
