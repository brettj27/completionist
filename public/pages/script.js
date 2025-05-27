document.addEventListener("DOMContentLoaded", () => {
    const timerDisplay = document.getElementById("timer");
    const statusText = document.querySelector(".statustext");
    const pointValue = document.querySelector(".pointvalue");
    const totalWords = document.querySelector(".wordsfoundam");

    let playerName = prompt("Enter your name:") || "Anonymous";
    let gameToken = null;
    let points = 0;
    let timeLeft = 30;
    let timerInterval;
    let curBubble = 0;
    let current = "";

    let enteredBubbleId = 1;
    let currentBreak = 1;
    let curEnter = 0;
    let totalFound = 0;


    let startLet = "C";
    let endLet = "R";
    let entered = [];
    let endFull = false;

    document.getElementById("bubble_0").innerText = startLet;
    document.getElementById("bubble_last").innerText = endLet;

    function createToken(length) {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
        let token = "";
        for (let i = 0; i < length; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    async function startTurn() {
        timerDisplay.innerText = timeLeft;
        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                endTurn();
            }
        }, 1000);
    }

    async function endTurn() {
        const db = window.firebaseDB;
        const { doc, getDoc, setDoc } = window.firestore;
        const gameRef = doc(db, "games", gameToken);
        const snapshot = await getDoc(gameRef);

        if (snapshot.exists()) {
            const gameData = snapshot.data();
            const players = gameData.players || {};
            players[playerName] = {
                words: entered,
                score: points,
                finished: true
            };

            await setDoc(gameRef, { players }, { merge: true });

            const playerKeys = Object.keys(players);
            const allFinished = playerKeys.length === 2 && playerKeys.every(p => players[p].finished);
            if (allFinished) {
                let resultText = "";
                playerKeys.forEach(p => {
                    resultText += `${p}: ${players[p].score} points\nWords: ${players[p].words.join(", ")}\n\n`;
                });
                alert("Game Over!\n" + resultText);
            } else {
                alert("Your turn is over! Waiting for the other player...");
            }
        }
    }

    /*
    record player joined
    */

    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("game");
    if (tokenFromUrl) {
        gameToken = tokenFromUrl;
        startTurn();

        // ✅ Now that gameToken is known, safely do Firestore logic:
        const db = window.firebaseDB;
        const { doc, getDoc, setDoc } = window.firestore;
        const gameRef = doc(db, "games", gameToken);

        (async () => {
            const snapshot = await getDoc(gameRef);
            if (snapshot.exists()) {
                const data = snapshot.data();
                const players = data.players || {};

                if (!players[playerName]) {
                    players[playerName] = {
                        words: [],
                        score: 0,
                        finished: false
                    };
                    await setDoc(gameRef, { players }, { merge: true });

                    console.log(`${playerName} joined game ${gameToken}`);
                } else {
                    console.log(`${playerName} reloaded game ${gameToken}`);
                }
            }
        })();
    }

    /* 
    typing functionality
    */

    document.addEventListener("keydown", function (event) {
        if (timeLeft <= 0) return;

        let key = event.key;
        let keyUp = key.toUpperCase();
        let keyDown = key.toLowerCase();
        if (key.length == 1 && keyUp.codePointAt(0) != keyDown.codePointAt(0)) {
            if (curBubble == 0) {
                if (event.key.toUpperCase() == startLet) {
                    document.getElementById("bubble_0").style.color = "limegreen";
                    current += event.key.toUpperCase();
                    curBubble++;
                }
                else {
                    document.getElementById("bubble_0").style.color = "red";
                    document.getElementById("bubble_0").innerText = event.key.toUpperCase();
                    current += event.key.toUpperCase();
                    curBubble++;
                }
            }
            else if (curBubble > 0 && curBubble < 15) {
                if (event.key.toUpperCase() == endLet && endFull) {
                    addCell(endLet);
                }
                else if (event.key.toUpperCase() == endLet) {
                    document.getElementById("bubble_last").style.color = "limegreen";
                    current += event.key.toUpperCase();
                    endFull = true;
                }
                else if (event.key.toUpperCase() != endLet) {
                    if (endFull) {
                        current = current.substring(0, current.length - 1);
                        addCell(endLet);
                        addCell(event.key.toUpperCase());
                        document.getElementById("bubble_last").style.color = "gold";
                        endFull = false;
                    }
                    else {
                        addCell(event.key.toUpperCase());
                    }
                }
            }
        } else if (key === "Backspace") {
            current = current.slice(0, -1);
            if (endFull) {
                document.getElementById("bubble_last").style.color = "gold";
                endFull = false;
            } else if (curBubble > 1) {
                document.getElementById("bubble_" + (curBubble - 1)).remove();
                curBubble--;
            } else if (curBubble === 1) {
                document.getElementById("bubble_0").innerText = startLet;
                document.getElementById("bubble_0").style.color = "gold";
                curBubble--;
            }
        }

        if (key === "Enter") {
            if (endFull && !current.endsWith(endLet)) {
                current += endLet;
            }
            checkWord(current.toLowerCase());
        }
    });

    /*
    verifying the word when enter is clicked
    */

    async function checkWord(word) {
        try {
            const response = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + word);
            const val = response.status; // ✅ fixed here
            word = word.toUpperCase()
            if (!word) {
                resetBoard();
                return;
            } else if (word.length < 4) {
                resetBoard();
                showPopUp("Too short" + " " + word);
                return;
            } else if (!word.startsWith(startLet) || !word.endsWith(endLet)) {
                resetBoard();
                showPopUp("Invalid letters" + " " + word);
                return;
            }

            if (val === 404) {
                resetBoard();
                showPopUp("Invalid word" + " " + word);
                return;
            }

            if (entered.includes(word)) {
                resetBoard();
                showPopUp("Already found" + " " + word);
                return;
            }

            points += word.length;
            pointValue.innerText = points;
            entered.push(word);
            addEnteredWord(word);
            showPopUp("+" + word.length + " points");

            if (window.gameToken) {
                const db = window.firebaseDB;
                const { doc, getDoc, setDoc } = window.firestore;
                const gameRef = doc(db, "games", window.gameToken);
                const snapshot = await getDoc(gameRef);
                if (snapshot.exists()) {
                    const gameData = snapshot.data();
                    const players = gameData.players || {};
                    players[playerName] = {
                        words: entered,
                        score: points,
                        finished: false
                    };
                    await setDoc(gameRef, { players }, { merge: true });
                }
            }

            resetBoard();
        } catch (error) {
            console.error("Error validating word:", error);
            showPopUp("Validation error");
            resetBoard();
        }
    }


    function showPopUp(message) {
        statusText.innerText = message;
        statusText.style.opacity = "1";
        setTimeout(() => {
            statusText.style.opacity = "0";
        }, 1500);
    }

    function resetBoard() {
        for (let i = 1; i < curBubble; i++) {
            const el = document.getElementById("bubble_" + i);
            if (el) el.remove();
        }
        document.getElementById("bubble_0").innerText = startLet;
        document.getElementById("bubble_last").innerText = endLet;
        document.getElementById("bubble_0").style.color = "gold";
        document.getElementById("bubble_last").style.color = "gold";
        curBubble = 0;
        endFull = false;
        current = "";
        totalWords.innerText = totalFound;
    }

    function addCell(let) {
        let newElem = document.createElement('div');
        let insertElem = document.getElementById('bubble_' + (curBubble - 1));
        newElem.className = 'bubble';
        newElem.textContent = let;
        newElem.id = "bubble_" + curBubble;
        newElem.appendAfter(insertElem);
        current += let;
        curBubble++;
    }

    // adds a bubble to the entered words box

    function addEnteredCell(let) {
        let newElem = document.createElement('div');
        let insertElem = document.getElementById('entered_' + (enteredBubbleId - 1));
        newElem.className = 'enteredbubble';
        newElem.id = "entered_" + enteredBubbleId;
        newElem.textContent = let;
        newElem.appendAfter(insertElem);
        enteredBubbleId++;
    }

    // adds a word to the entered cells box

    function addEnteredWord(word) {
        let newElem = document.createElement('div');
        let insertElem = document.getElementById('break' + currentBreak);
        newElem.className = 'enteredbubble';
        newElem.id = "entered_" + enteredBubbleId;
        newElem.textContent = word.substring(0, 1);
        newElem.appendBefore(insertElem);
        //chooses the first bubble in each row to correctly insert a break so it is in recent order
        curEnter = enteredBubbleId;
        enteredBubbleId++;
        for (let i = 1; i < word.length; i++) {
            addEnteredCell(word.substring(i, i + 1));
        }
        entered.push(word);
        totalFound++;
        addBreak();
    }

    // adds a new line break in the inline-flex

    function addBreak() {
        currentBreak++;
        let newElem = document.createElement('div');
        let insertElem = document.getElementById('entered_' + curEnter);
        newElem.className = 'break';
        newElem.id = "break" + currentBreak;
        newElem.appendBefore(insertElem);
    }
});


/*
functions for appendAfter, appendBefore etc
*/

Element.prototype.appendAfter = function (element) {
    element.parentNode.insertBefore(this, element.nextSibling);
}, false;

Element.prototype.appendBefore = function (element) {
    element.parentNode.insertBefore(this, element);
}, false;

/*
multiplayer shit
*/
