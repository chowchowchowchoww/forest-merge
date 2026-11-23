/* ==================================================
   Forest Merge
   Browser-side 2048 game
   ================================================== */

const directions = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    a: "left",
    A: "left",
    d: "right",
    D: "right",
    w: "up",
    W: "up",
    s: "down",
    S: "down"
};

const SAVE_KEY = "forestMergeSavedGame";
const BEST_KEY = "forestMergeBest";
const TUTORIAL_KEY = "forestMergeTutorialSeen";

let board = createEmptyBoard();
let score = 0;

let gameFinished = false;
let moveInProgress = false;
let wonAnnounced = false;
let soundEnabled = true;

let touchStartX = 0;
let touchStartY = 0;
let tutorialPage = 0;
let meowlSide = "right";

let audioContext = null;

const shownMilestones = new Set();

const boardElement =
    document.getElementById("board");

const scoreElement =
    document.getElementById("score");

const bestScoreElement =
    document.getElementById("best-score");

const messageElement =
    document.getElementById("message");

const statusTextElement =
    document.getElementById("status-text");

const newGameButton =
    document.getElementById("new-game-button");

const gameOverNewGameButton =
    document.getElementById("game-over-new-game");

const victoryNewGameButton =
    document.getElementById("victory-new-game");

const soundButton =
    document.getElementById("sound-button");

const helpButton =
    document.getElementById("help-button");

const gameOverScene =
    document.getElementById("game-over-scene");

const milestoneEffect =
    document.getElementById("milestone-effect");

const effectImage =
    document.getElementById("effect-image");

const effectNumber =
    document.getElementById("effect-number");

const tutorialOverlay =
    document.getElementById("tutorial-overlay");

const tutorialPages =
    document.querySelectorAll(".tutorial-page");

const tutorialDots =
    document.querySelectorAll(".tutorial-dot");

const tutorialBack =
    document.getElementById("tutorial-back");

const tutorialNext =
    document.getElementById("tutorial-next");

const tutorialSkip =
    document.getElementById("tutorial-skip");

const closeTutorial =
    document.getElementById("close-tutorial");

const victoryOverlay =
    document.getElementById("victory-overlay");

const continueButton =
    document.getElementById("continue-button");


/* ==================================================
   Board creation
   ================================================== */

function createEmptyBoard() {
    return [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
}


function copyBoard(sourceBoard) {
    return sourceBoard.map(function (row) {
        return [...row];
    });
}


function boardsAreEqual(firstBoard, secondBoard) {
    return firstBoard.every(function (row, rowIndex) {
        return row.every(function (value, columnIndex) {
            return value ===
                secondBoard[rowIndex][columnIndex];
        });
    });
}


function addRandomTile() {
    const emptyCells = [];

    for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
            if (board[row][column] === 0) {
                emptyCells.push({
                    row: row,
                    column: column
                });
            }
        }
    }

    if (emptyCells.length === 0) {
        return;
    }

    const randomCell =
        emptyCells[
            Math.floor(Math.random() * emptyCells.length)
        ];

    const newNumber =
        Math.random() < 0.8 ? 2 : 4;

    board[randomCell.row][randomCell.column] =
        newNumber;
}


/* ==================================================
   Movement and merging
   ================================================== */
const TILE_SLIDE_DURATION = 110;

function getMovementLines(direction) {
    const lines = [];

    if (direction === "left") {
        for (let row = 0; row < 4; row += 1) {
            lines.push([
                { row: row, column: 0 },
                { row: row, column: 1 },
                { row: row, column: 2 },
                { row: row, column: 3 }
            ]);
        }
    } else if (direction === "right") {
        for (let row = 0; row < 4; row += 1) {
            lines.push([
                { row: row, column: 3 },
                { row: row, column: 2 },
                { row: row, column: 1 },
                { row: row, column: 0 }
            ]);
        }
    } else if (direction === "up") {
        for (let column = 0; column < 4; column += 1) {
            lines.push([
                { row: 0, column: column },
                { row: 1, column: column },
                { row: 2, column: column },
                { row: 3, column: column }
            ]);
        }
    } else if (direction === "down") {
        for (let column = 0; column < 4; column += 1) {
            lines.push([
                { row: 3, column: column },
                { row: 2, column: column },
                { row: 1, column: column },
                { row: 0, column: column }
            ]);
        }
    }

    return lines;
}


function createMovementPlan(oldBoard, direction) {
    const moves = [];
    const mergedTargets = [];

    const lines = getMovementLines(direction);

    for (const line of lines) {
        const occupiedCells = [];

        for (const position of line) {
            const value =
                oldBoard[position.row][position.column];

            if (value !== 0) {
                occupiedCells.push({
                    value: value,
                    source: position
                });
            }
        }

        let sourceIndex = 0;
        let destinationIndex = 0;

        while (sourceIndex < occupiedCells.length) {
            const current = occupiedCells[sourceIndex];

            const next =
                occupiedCells[sourceIndex + 1];

            const destination =
                line[destinationIndex];

            if (
                next &&
                current.value === next.value
            ) {
                moves.push({
                    value: current.value,
                    source: current.source,
                    destination: destination
                });

                moves.push({
                    value: next.value,
                    source: next.source,
                    destination: destination
                });

                mergedTargets.push(destination);

                sourceIndex += 2;
            } else {
                moves.push({
                    value: current.value,
                    source: current.source,
                    destination: destination
                });

                sourceIndex += 1;
            }

            destinationIndex += 1;
        }
    }

    return {
        moves: moves,
        mergedTargets: mergedTargets
    };
}
function animateTileMovement(plan, finished) {
    const tiles =
        boardElement.querySelectorAll(".tile");

    const boardRectangle =
        boardElement.getBoundingClientRect();

    const animationLayer =
        document.createElement("div");

    animationLayer.className =
        "tile-animation-layer";

    boardElement.classList.add("is-sliding");
    boardElement.appendChild(animationLayer);

    for (const move of plan.moves) {
        const sourceIndex =
            move.source.row * 4 +
            move.source.column;

        const destinationIndex =
            move.destination.row * 4 +
            move.destination.column;

        const sourceRectangle =
            tiles[sourceIndex].getBoundingClientRect();

        const destinationRectangle =
            tiles[destinationIndex].getBoundingClientRect();

        const movingTile =
            document.createElement("div");

        movingTile.className =
            `tile tile-${move.value} moving-tile`;

        movingTile.textContent = move.value;

        movingTile.style.width =
            `${sourceRectangle.width}px`;

        movingTile.style.height =
            `${sourceRectangle.height}px`;

        movingTile.style.left =
            `${sourceRectangle.left -
            boardRectangle.left}px`;

        movingTile.style.top =
            `${sourceRectangle.top -
            boardRectangle.top}px`;

        animationLayer.appendChild(movingTile);

        const movementX =
            destinationRectangle.left -
            sourceRectangle.left;

        const movementY =
            destinationRectangle.top -
            sourceRectangle.top;

        window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
        movingTile.style.transform =
            `translate3d(${movementX}px, ${movementY}px, 0)`;
    });
});
    }

    window.setTimeout(function () {
        animationLayer.remove();
        boardElement.classList.remove("is-sliding");

        for (const target of plan.mergedTargets) {
            const tileIndex =
                target.row * 4 + target.column;

            const tile = tiles[tileIndex];

            tile.classList.remove("tile-merge-pop");

            void tile.offsetWidth;

            tile.classList.add("tile-merge-pop");

            window.setTimeout(function () {
                tile.classList.remove(
                    "tile-merge-pop"
                );
            }, 145);
        }

        finished();
    }, TILE_SLIDE_DURATION);
}
function mergeRowLeft(row) {
    const numbers = row.filter(function (number) {
        return number !== 0;
    });

    const mergedRow = [];
    const mergedTiles = [];

    let index = 0;

    while (index < numbers.length) {
        if (
            index + 1 < numbers.length &&
            numbers[index] === numbers[index + 1]
        ) {
            const mergedNumber =
                numbers[index] * 2;

            mergedRow.push(mergedNumber);
            mergedTiles.push(mergedNumber);

            score += mergedNumber;
            index += 2;
        } else {
            mergedRow.push(numbers[index]);
            index += 1;
        }
    }

    while (mergedRow.length < 4) {
        mergedRow.push(0);
    }

    return {
        row: mergedRow,
        mergedTiles: mergedTiles
    };
}


function reverseRow(row) {
    return [...row].reverse();
}


function transposeBoard(sourceBoard) {
    return sourceBoard[0].map(
        function (_, columnIndex) {
            return sourceBoard.map(
                function (row) {
                    return row[columnIndex];
                }
            );
        }
    );
}


function moveLeft() {
    const newBoard = [];
    const mergedTiles = [];

    for (const row of board) {
        const result = mergeRowLeft(row);

        newBoard.push(result.row);
        mergedTiles.push(...result.mergedTiles);
    }

    board = newBoard;

    return mergedTiles;
}


function moveRight() {
    const newBoard = [];
    const mergedTiles = [];

    for (const row of board) {
        const reversedRow = reverseRow(row);
        const result = mergeRowLeft(reversedRow);

        newBoard.push(reverseRow(result.row));
        mergedTiles.push(...result.mergedTiles);
    }

    board = newBoard;

    return mergedTiles;
}


function moveUp() {
    board = transposeBoard(board);

    const mergedTiles = moveLeft();

    board = transposeBoard(board);

    return mergedTiles;
}


function moveDown() {
    board = transposeBoard(board);

    const mergedTiles = moveRight();

    board = transposeBoard(board);

    return mergedTiles;
}


function performMove(direction) {
    if (moveInProgress || gameFinished) {
        return;
    }

    moveInProgress = true;

    const oldBoard = copyBoard(board);

    const movementPlan =
        createMovementPlan(oldBoard, direction);

    let mergedTiles = [];

    if (direction === "left") {
        mergedTiles = moveLeft();
    } else if (direction === "right") {
        mergedTiles = moveRight();
    } else if (direction === "up") {
        mergedTiles = moveUp();
    } else if (direction === "down") {
        mergedTiles = moveDown();
    }

    const boardChanged =
        !boardsAreEqual(oldBoard, board);

    if (!boardChanged) {
        moveInProgress = false;
        return;
    }

    addRandomTile();

    /*
       The finished board is prepared underneath.
       The moving copies animate above it.
    */

    updateBoardDisplay();
    updateScoreDisplay();
    saveGame();

    animateTileMovement(
        movementPlan,
        function () {
            if (mergedTiles.length > 0) {
                playMergeChord(mergedTiles);
                showMergeNumbers(mergedTiles);

                const largestMerge =
                    Math.max(...mergedTiles);

                showMilestone(largestMerge);
            }

            if (
                hasReached2048() &&
                !wonAnnounced
            ) {
                wonAnnounced = true;
                saveGame();

                window.setTimeout(
                    showVictory,
                    280
                );
            } else if (isGameOver()) {
                window.setTimeout(
                    showGameOver,
                    150
                );
            }

            moveInProgress = false;
        }
    );
}


/* ==================================================
   Game checks
   ================================================== */

function hasReached2048() {
    return board.some(function (row) {
        return row.includes(2048);
    });
}


function isGameOver() {
    for (const row of board) {
        if (row.includes(0)) {
            return false;
        }
    }

    for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 3; column += 1) {
            if (
                board[row][column] ===
                board[row][column + 1]
            ) {
                return false;
            }
        }
    }

    for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 4; column += 1) {
            if (
                board[row][column] ===
                board[row + 1][column]
            ) {
                return false;
            }
        }
    }

    return true;
}


/* ==================================================
   Board display
   ================================================== */

function ensureBoardTiles() {
    const existingTiles =
        boardElement.querySelectorAll(".tile");

    if (existingTiles.length === 16) {
        return;
    }

    boardElement.innerHTML = "";

    for (let index = 0; index < 16; index += 1) {
        const tile = document.createElement("div");

        tile.className = "tile tile-0";
        tile.dataset.value = "0";

        boardElement.appendChild(tile);
    }
}


function updateBoardDisplay(previousBoard = null) {
    ensureBoardTiles();

    const tiles =
        boardElement.querySelectorAll(".tile");

    let tileIndex = 0;

    for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
            const number = board[row][column];
            const tile = tiles[tileIndex];

            const previousNumber =
                previousBoard
                    ? previousBoard[row][column]
                    : Number(tile.dataset.value || 0);

            tile.className = `tile tile-${number}`;
            tile.textContent =
                number === 0 ? "" : number;

            tile.dataset.value = String(number);

            if (
                previousBoard &&
                previousNumber !== number
            ) {
                tile.classList.add("tile-changed");

                window.setTimeout(function () {
                    tile.classList.remove("tile-changed");
                }, 150);
            }

            tileIndex += 1;
        }
    }
}


function updateScoreDisplay() {
    scoreElement.textContent = score;
    updateBestScore(score);
}


/* ==================================================
   Auto-save
   ================================================== */

function isValidBoard(savedBoard) {
    if (
        !Array.isArray(savedBoard) ||
        savedBoard.length !== 4
    ) {
        return false;
    }

    return savedBoard.every(function (row) {
        if (
            !Array.isArray(row) ||
            row.length !== 4
        ) {
            return false;
        }

        return row.every(function (number) {
            if (
                !Number.isInteger(number) ||
                number < 0
            ) {
                return false;
            }

            if (number === 0) {
                return true;
            }

            return (
                number >= 2 &&
                (number & (number - 1)) === 0
            );
        });
    });
}


function saveGame() {
    const gameState = {
        board: board,
        score: score,
        wonAnnounced: wonAnnounced,
        shownMilestones: Array.from(shownMilestones)
    };

    try {
        localStorage.setItem(
            SAVE_KEY,
            JSON.stringify(gameState)
        );
    } catch (error) {
        console.warn("The game could not be saved.");
    }
}


function loadSavedGame() {
    try {
        const savedText =
            localStorage.getItem(SAVE_KEY);

        if (!savedText) {
            return false;
        }

        const savedGame = JSON.parse(savedText);

        if (!isValidBoard(savedGame.board)) {
            return false;
        }

        if (
            !Number.isFinite(savedGame.score) ||
            savedGame.score < 0
        ) {
            return false;
        }

        board = savedGame.board;
        score = Math.floor(savedGame.score);

        wonAnnounced =
            savedGame.wonAnnounced === true;

        if (Array.isArray(savedGame.shownMilestones)) {
            savedGame.shownMilestones.forEach(
                function (milestone) {
                    if (Number.isFinite(milestone)) {
                        shownMilestones.add(milestone);
                    }
                }
            );
        }

        return true;
    } catch (error) {
        return false;
    }
}


/* ==================================================
   Best score
   ================================================== */

function loadBestScore() {
    const savedBest =
        Number(localStorage.getItem(BEST_KEY));

    if (
        Number.isFinite(savedBest) &&
        savedBest >= 0
    ) {
        bestScoreElement.textContent =
            Math.floor(savedBest);
    } else {
        bestScoreElement.textContent = "0";
    }
}


function updateBestScore(currentScore) {
    const currentBest =
        Number(bestScoreElement.textContent) || 0;

    if (currentScore > currentBest) {
        bestScoreElement.textContent =
            currentScore;

        localStorage.setItem(
            BEST_KEY,
            String(currentScore)
        );
    }
}


/* ==================================================
   Starting and resetting
   ================================================== */

function createNewGame() {
    board = createEmptyBoard();
    score = 0;

    gameFinished = false;
    moveInProgress = false;
    wonAnnounced = false;

    shownMilestones.clear();

    addRandomTile();
    addRandomTile();

    victoryOverlay.classList.add("hidden");
    gameOverScene.classList.remove("visible");
    boardElement.classList.remove("board-dimmed");

    messageElement.textContent = "";
    statusTextElement.textContent =
        "Game in progress";

    updateBoardDisplay();
    updateScoreDisplay();
    saveGame();
}


function requestNewGame() {
    if (score > 0 && !gameFinished) {
        const shouldStart = window.confirm(
            "Start a new game? Your current progress will be lost."
        );

        if (!shouldStart) {
            return;
        }
    }

    createNewGame();
}


newGameButton.addEventListener(
    "click",
    requestNewGame
);

gameOverNewGameButton.addEventListener(
    "click",
    createNewGame
);

victoryNewGameButton.addEventListener(
    "click",
    createNewGame
);


/* ==================================================
   Keyboard controls
   ================================================== */

document.addEventListener("keydown", function (event) {
    if (
        !tutorialOverlay.classList.contains("hidden") ||
        !victoryOverlay.classList.contains("hidden")
    ) {
        return;
    }

    const direction = directions[event.key];

    if (!direction) {
        return;
    }

    event.preventDefault();
    performMove(direction);
});


/* ==================================================
   Phone swipe controls
   ================================================== */

boardElement.addEventListener(
    "touchstart",
    function (event) {
        if (gameFinished || moveInProgress) {
            return;
        }

        const touch = event.changedTouches[0];

        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    },
    { passive: true }
);


boardElement.addEventListener(
    "touchmove",
    function (event) {
        event.preventDefault();
    },
    { passive: false }
);


boardElement.addEventListener(
    "touchend",
    function (event) {
        if (gameFinished || moveInProgress) {
            return;
        }

        const touch = event.changedTouches[0];

        const differenceX =
            touch.clientX - touchStartX;

        const differenceY =
            touch.clientY - touchStartY;

        if (
            Math.abs(differenceX) < 25 &&
            Math.abs(differenceY) < 25
        ) {
            return;
        }

        if (
            Math.abs(differenceX) >
            Math.abs(differenceY)
        ) {
            performMove(
                differenceX > 0
                    ? "right"
                    : "left"
            );
        } else {
            performMove(
                differenceY > 0
                    ? "down"
                    : "up"
            );
        }
    },
    { passive: true }
);


/* ==================================================
   Merge feedback
   ================================================== */

function showMergeNumbers(mergedTiles) {
    let feedbackContainer =
        document.getElementById(
            "merge-feedback-container"
        );

    if (!feedbackContainer) {
        feedbackContainer =
            document.createElement("div");

        feedbackContainer.id =
            "merge-feedback-container";

        feedbackContainer.className =
            "merge-feedback-container";

        document
            .querySelector(".board-area")
            .appendChild(feedbackContainer);
    }

    mergedTiles.forEach(function (number, index) {
        const feedback =
            document.createElement("div");

        feedback.className = "merge-feedback";
        feedback.textContent = `+${number}`;

        feedback.style.setProperty(
            "--feedback-index",
            String(index)
        );

        feedbackContainer.appendChild(feedback);

        window.setTimeout(function () {
            feedback.remove();
        }, 1100);
    });
}


/* ==================================================
   Meowl milestones
   ================================================== */

function getMilestone(number) {
    const milestones =
        [32, 64, 128, 256, 512, 1024];

    let reachedMilestone = 0;

    for (const milestone of milestones) {
        if (number >= milestone) {
            reachedMilestone = milestone;
        }
    }

    return reachedMilestone;
}


function showMilestone(number) {
    const milestone = getMilestone(number);

    if (
        milestone === 0 ||
        shownMilestones.has(milestone)
    ) {
        return;
    }

    shownMilestones.add(milestone);
    saveGame();

    milestoneEffect.className =
        "milestone-effect";

    effectImage.className = "";
    effectNumber.textContent = `+${milestone}`;

    meowlSide =
        meowlSide === "right"
            ? "left"
            : "right";

    milestoneEffect.classList.add(
        `effect-${meowlSide}`
    );

    let duration = 1800;

    if (milestone <= 64) {
        effectImage.src =
            "/static/peek-meowl.png";

        milestoneEffect.classList.add(
            "peek-effect-large"
        );

        duration = 1800;
    } else if (milestone <= 256) {
        effectImage.src =
            "/static/peek-meowl.png";

        milestoneEffect.classList.add(
            "strong-effect-large"
        );

        duration = 2100;
    } else {
        effectImage.src =
            "/static/flying-meowl.png";

        milestoneEffect.classList.add(
            "flying-effect-large"
        );

        duration = 2500;
    }

    milestoneEffect.classList.remove("show");

    window.requestAnimationFrame(function () {
        milestoneEffect.classList.add("show");
    });

    window.setTimeout(function () {
        milestoneEffect.classList.remove("show");
    }, duration);
}


/* ==================================================
   Victory and game over
   ================================================== */

function showGameOver() {
    if (gameFinished) {
        return;
    }

    gameFinished = true;

    statusTextElement.textContent =
        "Game over";

    boardElement.classList.add("board-dimmed");
    gameOverScene.classList.add("visible");

    playGameOverSound();
    saveGame();
}


function showVictory() {
    gameFinished = true;

    victoryOverlay.classList.remove("hidden");

    playVictorySound();
    saveGame();
}


continueButton.addEventListener("click", function () {
    victoryOverlay.classList.add("hidden");

    gameFinished = false;
    wonAnnounced = true;

    statusTextElement.textContent =
        "Beyond 2048";

    saveGame();
});


/* ==================================================
   Sound
   ================================================== */

function getAudioContext() {
    if (!audioContext) {
        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) {
            return null;
        }

        audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    return audioContext;
}


function playTone(
    frequency,
    startDelay,
    duration,
    volume,
    type = "sine"
) {
    if (!soundEnabled) {
        return;
    }

    const context = getAudioContext();

    if (!context) {
        return;
    }

    const startTime =
        context.currentTime + startDelay;

    const oscillator =
        context.createOscillator();

    const gain =
        context.createGain();

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
        frequency,
        startTime
    );

    gain.gain.setValueAtTime(
        0.001,
        startTime
    );

    gain.gain.exponentialRampToValueAtTime(
        volume,
        startTime + 0.015
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + duration
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}


function getMergeSound(number) {
    if (number <= 8) {
        return {
            frequencies: [230],
            duration: 0.16,
            volume: 0.13,
            type: "triangle"
        };
    }

    if (number <= 32) {
        return {
            frequencies: [300, 450],
            duration: 0.2,
            volume: 0.14,
            type: "triangle"
        };
    }

    if (number <= 128) {
        return {
            frequencies: [360, 540],
            duration: 0.25,
            volume: 0.15,
            type: "sine"
        };
    }

    if (number <= 512) {
        return {
            frequencies: [420, 630, 840],
            duration: 0.33,
            volume: 0.17,
            type: "sine"
        };
    }

    return {
        frequencies: [523, 659, 784, 1046],
        duration: 0.42,
        volume: 0.19,
        type: "sine"
    };
}


function playMergeChord(mergedTiles) {
    mergedTiles.forEach(function (number, mergeIndex) {
        const sound = getMergeSound(number);

        sound.frequencies.forEach(
            function (frequency, noteIndex) {
                playTone(
                    frequency,
                    mergeIndex * 0.035 +
                        noteIndex * 0.025,
                    sound.duration,
                    sound.volume /
                        Math.max(
                            1,
                            mergedTiles.length * 0.7
                        ),
                    sound.type
                );
            }
        );
    });
}


function playVictorySound() {
    [523, 659, 784, 1046].forEach(
        function (frequency, index) {
            playTone(
                frequency,
                index * 0.13,
                0.48,
                0.18,
                "sine"
            );
        }
    );
}


function playGameOverSound() {
    [330, 277, 220].forEach(
        function (frequency, index) {
            playTone(
                frequency,
                index * 0.15,
                0.32,
                0.08,
                "triangle"
            );
        }
    );
}


soundButton.addEventListener("click", function () {
    soundEnabled = !soundEnabled;

    soundButton.textContent =
        soundEnabled ? "🔊" : "🔇";

    soundButton.setAttribute(
        "aria-label",
        soundEnabled
            ? "Mute sounds"
            : "Turn on sounds"
    );

    if (soundEnabled) {
        playTone(
            440,
            0,
            0.1,
            0.1,
            "sine"
        );
    }
});


/* ==================================================
   Tutorial
   ================================================== */

function openTutorial() {
    tutorialPage = 0;
    updateTutorial();

    tutorialOverlay.classList.remove("hidden");
}


function closeTutorialWindow() {
    tutorialOverlay.classList.add("hidden");

    localStorage.setItem(
        TUTORIAL_KEY,
        "yes"
    );
}


function updateTutorial() {
    tutorialPages.forEach(function (page, index) {
        page.classList.toggle(
            "active",
            index === tutorialPage
        );
    });

    tutorialDots.forEach(function (dot, index) {
        dot.classList.toggle(
            "active",
            index === tutorialPage
        );
    });

    tutorialBack.style.visibility =
        tutorialPage === 0
            ? "hidden"
            : "visible";

    tutorialNext.textContent =
        tutorialPage === tutorialPages.length - 1
            ? "Start Playing"
            : "Next";
}


tutorialNext.addEventListener("click", function () {
    if (tutorialPage < tutorialPages.length - 1) {
        tutorialPage += 1;
        updateTutorial();
    } else {
        closeTutorialWindow();
    }
});


tutorialBack.addEventListener("click", function () {
    if (tutorialPage > 0) {
        tutorialPage -= 1;
        updateTutorial();
    }
});


tutorialSkip.addEventListener(
    "click",
    closeTutorialWindow
);

closeTutorial.addEventListener(
    "click",
    closeTutorialWindow
);

helpButton.addEventListener(
    "click",
    openTutorial
);


/* ==================================================
   Startup
   ================================================== */

function startApplication() {
    loadBestScore();
    ensureBoardTiles();

    const restoredGame = loadSavedGame();

    if (!restoredGame) {
        createNewGame();
    } else {
        updateBoardDisplay();
        updateScoreDisplay();

        statusTextElement.textContent =
            wonAnnounced
                ? "Beyond 2048"
                : "Game in progress";

        if (isGameOver()) {
            showGameOver();
        }
    }

    if (
        localStorage.getItem(TUTORIAL_KEY) !== "yes"
    ) {
        openTutorial();
    }
}


startApplication();
