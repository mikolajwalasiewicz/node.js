const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let alphabet = "ABCDEFGHIJKLMNOPRSTUVWZ".split('');
let usedLetters = [];
let players = [];
let scores = {};
let confirmed = {};
let roundInProgress = false;
let roundNumber = 0;
let countdown;
let currentRoundStarterIndex = 0;
const roundTimeLimit = 60 * 1000;

// Pliki z danymi
const countries = fs.readFileSync('countries.txt', 'utf-8').split('\n').map(item => item.trim().toLowerCase());
const cities = fs.readFileSync('cities.txt', 'utf-8').split('\n').map(item => item.trim().toLowerCase());
const names = fs.readFileSync('names.txt', 'utf-8').split('\n').map(item => item.trim().toLowerCase());

io.on('connection', (socket) => {
    console.log('A player connected');
    
    socket.on('joinGame', (nickname) => {
        console.log(`Player ${nickname} is attempting to join the game.`);

        players.push({ id: socket.id, nickname });
        scores[socket.id] = 0;
        confirmed[socket.id] = false;

        console.log(`${nickname} dołączył do gry`);

        // Emituj aktualizację do wszystkich graczy
        io.emit('updatePlayers', { players, scores, confirmed, currentRoundStarterIndex });
        socket.emit('nicknameSet', nickname);
    });

    socket.on('startRound', () => {
        if (socket.id !== players[currentRoundStarterIndex].id || roundInProgress) return;

        roundInProgress = true;

        console.log(`Before increment, roundNumber is: ${roundNumber}`);
        roundNumber++;  // Increment the round number
        console.log(`Starting round ${roundNumber}`);

        players.forEach(player => {
            confirmed[player.id] = false;
            io.to(player.id).emit('resetSubmitButton'); // Reset the submit button for all players
        });

        let letter = alphabet[Math.floor(Math.random() * alphabet.length)];
        usedLetters.push(letter);
        alphabet = alphabet.filter(l => l !== letter);

        io.emit('roundStarted', { letter, roundNumber });
        startTimer();

        currentRoundStarterIndex = (currentRoundStarterIndex + 1) % players.length;
        io.emit('updatePlayers', { players, scores, confirmed, currentRoundStarterIndex });
    });

    socket.on('submitAnswers', async (answers, letter) => {
        if (confirmed[socket.id]) {
            socket.emit('alreadyConfirmed', "Już zatwierdziłeś swoje odpowiedzi.");
            return;
        }

        let isValid = true;

        // Sprawdzenie, czy odpowiedzi zaczynają się na właściwą literę
        Object.entries(answers).forEach(([category, answer]) => {
            if (answer.trim() === '' || answer.charAt(0).toUpperCase() !== letter) {
                isValid = false;
                socket.emit('invalidAnswer', `Odpowiedź w kategorii ${category} nie zaczyna się na literę ${letter}`);
            }
        });

        if (isValid) {
            const validAnswers = validateAnswersFromFiles(answers);
            let duplicateCheck = {};

            Object.entries(validAnswers).forEach(([category, answer]) => {
                if (answer) {
                    if (!duplicateCheck[category]) {
                        duplicateCheck[category] = {};
                    }
                    if (!duplicateCheck[category][answer]) {
                        duplicateCheck[category][answer] = [socket.id];
                    } else {
                        duplicateCheck[category][answer].push(socket.id);
                    }
                }
            });

            // Przyznawanie punktów
            Object.entries(validAnswers).forEach(([category, answer]) => {
                if (answer) {
                    const playersWithSameAnswer = duplicateCheck[category][answer];
                    if (playersWithSameAnswer.length > 1) {
                        playersWithSameAnswer.forEach(playerId => {
                            scores[playerId] += 5;  // Powtórzona odpowiedź
                        });
                    } else {
                        scores[socket.id] += 10;  // Unikalna odpowiedź
                    }
                }
            });

            confirmed[socket.id] = true;
            io.emit('updateScores', { players, scores, confirmed });

            if (allPlayersConfirmed()) {
                clearInterval(countdown);
                roundInProgress = false;
                io.emit('allPlayersConfirmed', "Wszyscy gracze zatwierdzili odpowiedzi.");
            }
        }
    });

    socket.on('disconnect', () => {
        players = players.filter(player => player.id !== socket.id);
        delete scores[socket.id];
        delete confirmed[socket.id];
        io.emit('updatePlayers', { players, scores, confirmed });

        if (players.length > 0 && currentRoundStarterIndex >= players.length) {
            currentRoundStarterIndex = players.length - 1;
        }
    });
});

function validateAnswersFromFiles(answers) {
    const result = {};

    if (countries.includes(answers.country.toLowerCase())) {
        result.country = answers.country;
    } else {
        result.country = null;
    }

    if (cities.includes(answers.city.toLowerCase())) {
        result.city = answers.city;
    } else {
        result.city = null;
    }

    if (names.includes(answers.name.toLowerCase())) {
        result.name = answers.name;
    } else {
        result.name = null;
    }

    return result;
}

function allPlayersConfirmed() {
    return players.every(player => confirmed[player.id]);
}

function startTimer() {
    let timer = roundTimeLimit / 1000;
    countdown = setInterval(() => {
        timer--;
        io.emit('timerUpdate', timer);
        if (timer <= 0) {
            clearInterval(countdown);
            roundInProgress = false;
            io.emit('timeUp', "Czas na odpowiedzi minął!");
            io.emit('updateScores', { players, scores, confirmed });
        }
    }, 1000);
}

app.use(express.static('public'));

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
