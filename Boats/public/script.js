// Create a 10x10 grid for the game
const createBoard = () => {
    const gameBoard = document.getElementById('game-board');
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const cell = document.createElement('div');
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', handleAttack);
            gameBoard.appendChild(cell);
        }
    }
};

// Function to handle attacks (click events)
const handleAttack = (event) => {
    const cell = event.target;
    const row = cell.dataset.row;
    const col = cell.dataset.col;

    if (Math.random() > 0.5) {
        cell.classList.add('hit');
        alert('Hit!');
    } else {
        cell.classList.add('miss');
        alert('Miss!');
    }
};

// Initialize the game board when the page loads
window.onload = createBoard;
