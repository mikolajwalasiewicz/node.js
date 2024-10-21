const socket = io();

let timerElement = document.createElement('p');
timerElement.id = 'timer';
document.getElementById('gameSection').appendChild(timerElement);

let roundCounterElement = document.createElement('p');
roundCounterElement.id = 'roundCounter';
document.getElementById('gameSection').prepend(roundCounterElement);

let countdown;
let isRoundStarter = false;

function startTimer(duration) {
    let timer = duration, minutes, seconds;
    countdown = setInterval(() => {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        document.getElementById('timer').textContent = `Pozostały czas: ${minutes}:${seconds}`;
        
        if (--timer < 0) {
            clearInterval(countdown);
        }
    }, 1000);
}

// Sprawdź, czy gracz jest liderem i ustaw widoczność przycisku
function updateRoundStarterVisibility(isRoundStarter) {
    const startButton = document.getElementById('startRoundButton');
    if (isRoundStarter) {
        startButton.style.display = 'block';
    } else {
        startButton.style.display = 'none';
    }
}

socket.on('letterSelected', (letter) => {
    document.getElementById('selectedLetter').innerText = `Wybrana litera: ${letter}`;
    document.getElementById('stopButton').style.display = 'none';
    startTimer(60);  // 60-sekundowy timer
});

socket.on('roundStarted', ({ letter, roundNumber }) => {
    console.log(`Received round number: ${roundNumber}`);
    
    document.getElementById('selectedLetter').innerText = `Wybrana litera: ${letter}`;
    document.getElementById('roundCounter').innerText = `Runda: ${roundNumber}`;
    
    document.getElementById('country').value = letter;
    document.getElementById('city').value = letter;
    document.getElementById('name').value = letter;
    
    startTimer(60);
});

document.getElementById('joinButton').addEventListener('click', () => {
    const nickname = document.getElementById('nickname').value;
    if (nickname) {
        socket.emit('joinGame', nickname);
        console.log(`Nick wysłany: ${nickname}`);
        document.getElementById('nicknameSection').style.display = 'none';
        document.getElementById('gameSection').style.display = 'block';
    } else {
        alert('Proszę wprowadzić swój nick');
    }
});

document.getElementById('startRoundButton').addEventListener('click', () => {
    if (isRoundStarter) {
        socket.emit('startRound');
    }
});

document.getElementById('submitAnswersButton').addEventListener('click', () => {
    const currentLetter = document.getElementById('selectedLetter').textContent.split(': ')[1];  // Pobieramy aktualną literę
    const answers = {
        country: document.getElementById('country').value,
        city: document.getElementById('city').value,
        name: document.getElementById('name').value
    };
    socket.emit('submitAnswers', answers, currentLetter);  // Wyślij odpowiedzi z literą
    document.getElementById('submitAnswersButton').disabled = true;  // Zablokuj przycisk po zatwierdzeniu
});

socket.on('resetSubmitButton', () => {
    document.getElementById('submitAnswersButton').disabled = false;  // Odblokowanie przycisku "Zatwierdź odpowiedzi"
});

socket.on('updatePlayers', ({ players, scores, confirmed, currentRoundStarterIndex }) => {
    const tbody = document.querySelector('#scoreboard tbody');
    tbody.innerHTML = '';  // Wyczyść tabelę przed aktualizacją
    players.forEach((player, index) => {
        const row = `<tr><td>${player.nickname}</td><td>${scores[player.id] || 0}</td><td>${confirmed[player.id] ? 'Tak' : 'Nie'}</td></tr>`;
        tbody.innerHTML += row;
    });

    const currentPlayerId = socket.id;
    isRoundStarter = players[currentRoundStarterIndex].id === currentPlayerId;

    updateRoundStarterVisibility(isRoundStarter); // Ustaw widoczność przycisku
});

socket.on('invalidAnswer', (message) => {
    alert(message);  // Pokazuje komunikat, że odpowiedzi są nieprawidłowe
});

socket.on('alreadyConfirmed', (message) => {
    alert(message);  // Informuje gracza, że już zatwierdził odpowiedzi
});

socket.on('updateScores', ({ players, scores, confirmed }) => {
    const tbody = document.querySelector('#scoreboard tbody');
    tbody.innerHTML = '';  // Wyczyść tabelę
    players.forEach(player => {
        const row = `<tr><td>${player.nickname}</td><td>${scores[player.id] || 0}</td><td>${confirmed[player.id] ? 'Tak' : 'Nie'}</td></tr>`;
        tbody.innerHTML += row;
    });
});

socket.on('endGame', (message) => {
    document.getElementById('gameSection').style.display = 'none';
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('gameOver').innerHTML = `<h2>${message}</h2>`;
});

socket.on('timeUp', (message) => {
    alert(message);
});

socket.on('allPlayersConfirmed', (message) => {
    clearInterval(countdown);  // Zatrzymanie timera, gdy wszyscy gracze zatwierdzili odpowiedzi
    console.log(message);  // Wyświetl komunikat w konsoli
});

socket.on('nicknameSet', (nickname) => {
    console.log(`Otrzymano nick: ${nickname}`);
    document.getElementById('selectedLetter').textContent = `Witaj, ${nickname}! Czekaj na rozpoczęcie rundy...`;
});
