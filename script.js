// script.js
// Full chess logic: board, moves, simple engine, timers.
// Requires auth.js globals: currentUser, allowPlay, statusElement.

const boardElement = document.getElementById("board");
const filesElement = document.getElementById("files");
const ranksElement = document.getElementById("ranks");
const moveLogElement = document.getElementById("moveLog");
const whiteClockElement = document.getElementById("whiteClock");
const blackClockElement = document.getElementById("blackClock");

// Sound effects
const clickSound = new Audio("sounds/sounds-click.mpeg");
const moveSound = new Audio("sounds/sounds-move.mpeg");

// Optional buttons (add to HTML header if you want)
// <button id="newGameBtn">New Game</button>
// <button id="flipBoardBtn">Flip Board</button>
const newGameBtn = document.getElementById("newGameBtn");
const flipBoardBtn = document.getElementById("flipBoardBtn");

const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["1","2","3","4","5","6","7","8"];

const PIECE_UNICODE = {
  "P": "\u2659",
  "N": "\u2658",
  "B": "\u2657",
  "R": "\u2656",
  "Q": "\u2655",
  "K": "\u2654",
  "p": "\u265F",
  "n": "\u265E",
  "b": "\u265D",
  "r": "\u265C",
  "q": "\u265B",
  "k": "\u265A"
};

let board = [];
let whiteToMove = true;
let selectedSquare = null;
let legalMoves = [];
let moveHistory = [];
let flipped = false;

let whiteCanCastleKing = true;
let whiteCanCastleQueen = true;
let blackCanCastleKing = true;
let blackCanCastleQueen = true;
let enPassantTarget = null;

let whiteTime = 10 * 60;
let blackTime = 10 * 60;
let timerInterval = null;

const vsComputer = true;

// Helpers

function indexToCoord(index) {
  const file = index % 8;
  const rank = Math.floor(index / 8);
  return { file, rank };
}

function coordToIndex(file, rank) {
  return rank * 8 + file;
}

function inBounds(file, rank) {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

function getPiece(index) {
  return board[index];
}

function setPiece(index, piece) {
  board[index] = piece;
}

function isWhite(piece) {
  return piece && piece === piece.toUpperCase();
}

function isBlack(piece) {
  return piece && piece === piece.toLowerCase();
}

function cloneBoard(srcBoard) {
  return srcBoard.slice();
}

// Timers

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return m + ":" + s;
}

function updateClocks() {
  whiteClockElement.textContent = formatTime(whiteTime);
  blackClockElement.textContent = formatTime(blackTime);
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (whiteToMove) {
      whiteTime--;
      if (whiteTime <= 0) {
        whiteTime = 0;
        stopTimer();
        if (statusElement) statusElement.textContent = "Black wins on time.";
      }
    } else {
      blackTime--;
      if (blackTime <= 0) {
        blackTime = 0;
        stopTimer();
        if (statusElement) statusElement.textContent = "White wins on time.";
      }
    }
    updateClocks();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

// Setup

function resetBoard() {
  board = new Array(64).fill(null);
  const backRankWhite = ["R","N","B","Q","K","B","N","R"];
  const backRankBlack = ["r","n","b","q","k","b","n","r"];

  for (let f = 0; f < 8; f++) {
    setPiece(coordToIndex(f, 0), backRankWhite[f]);
    setPiece(coordToIndex(f, 1), "P");
  }

  for (let f = 0; f < 8; f++) {
    setPiece(coordToIndex(f, 7), backRankBlack[f]);
    setPiece(coordToIndex(f, 6), "p");
  }

  whiteToMove = true;
  selectedSquare = null;
  legalMoves = [];
  moveHistory = [];
  flipped = false;

  whiteCanCastleKing = true;
  whiteCanCastleQueen = true;
  blackCanCastleKing = true;
  blackCanCastleQueen = true;
  enPassantTarget = null;

  whiteTime = 10 * 60;
  blackTime = 10 * 60;
  stopTimer();
  startTimer();
  updateClocks();

  renderBoard();
  renderMoveLog();
  updateStatus();
}

// Move generation

function isSquareAttackedByColor(boardState, targetIndex, attackerIsWhite) {
  const { file: tf, rank: tr } = indexToCoord(targetIndex);

  const pawnDir = attackerIsWhite ? 1 : -1;
  const pawnRanks = [tr - pawnDir];
  const pawnFiles = [tf - 1, tf + 1];
  for (const pr of pawnRanks) {
    for (const pf of pawnFiles) {
      if (!inBounds(pf, pr)) continue;
      const idx = coordToIndex(pf, pr);
      const p = boardState[idx];
      if (!p) continue;
      if (attackerIsWhite && p === "P") return true;
      if (!attackerIsWhite && p === "p") return true;
    }
  }

  const knightOffsets = [
    [1,2], [2,1], [2,-1], [1,-2],
    [-1,-2], [-2,-1], [-2,1], [-1,2]
  ];
  for (const [df,dr] of knightOffsets) {
    const nf = tf + df;
    const nr = tr + dr;
    if (!inBounds(nf, nr)) continue;
    const idx = coordToIndex(nf, nr);
    const p = boardState[idx];
    if (!p) continue;
    if (attackerIsWhite && p === "N") return true;
    if (!attackerIsWhite && p === "n") return true;
  }

  const bishopDirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
  for (const [df,dr] of bishopDirs) {
    let nf = tf + df;
    let nr = tr + dr;
    while (inBounds(nf, nr)) {
      const idx = coordToIndex(nf, nr);
      const p = boardState[idx];
      if (p) {
        if (attackerIsWhite && (p === "B" || p === "Q")) return true;
        if (!attackerIsWhite && (p === "b" || p === "q")) return true;
        break;
      }
      nf += df;
      nr += dr;
    }
  }

  const rookDirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [df,dr] of rookDirs) {
    let nf = tf + df;
    let nr = tr + dr;
    while (inBounds(nf, nr)) {
      const idx = coordToIndex(nf, nr);
      const p = boardState[idx];
      if (p) {
        if (attackerIsWhite && (p === "R" || p === "Q")) return true;
        if (!attackerIsWhite && (p === "r" || p === "q")) return true;
        break;
      }
      nf += df;
      nr += dr;
    }
  }

  const kingOffsets = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for (const [df,dr] of kingOffsets) {
    const nf = tf + df;
    const nr = tr + dr;
    if (!inBounds(nf, nr)) continue;
    const idx = coordToIndex(nf, nr);
    const p = boardState[idx];
    if (!p) continue;
    if (attackerIsWhite && p === "K") return true;
    if (!attackerIsWhite && p === "k") return true;
  }

  return false;
}

function findKingIndex(boardState, isWhiteKing) {
  const kingChar = isWhiteKing ? "K" : "k";
  for (let i = 0; i < 64; i++) {
    if (boardState[i] === kingChar) return i;
  }
  return -1;
}

function isKingInCheck(boardState, isWhiteSide) {
  const kingIndex = findKingIndex(boardState, isWhiteSide);
  if (kingIndex === -1) return false;
  return isSquareAttackedByColor(boardState, kingIndex, !isWhiteSide);
}

function addMoveIfLegal(moves, fromIndex, toIndex, promotion = null, special = null) {
  const trialBoard = cloneBoard(board);
  const movingPiece = trialBoard[fromIndex];
  const captured = trialBoard[toIndex];

  trialBoard[fromIndex] = null;
  trialBoard[toIndex] = movingPiece;

  if (promotion) {
    trialBoard[toIndex] = promotion;
  }

  // Castling rook move is handled outside this helper in king logic

  if (!isKingInCheck(trialBoard, isWhite(movingPiece))) {
    moves.push({ from: fromIndex, to: toIndex, promotion, special, captured });
  }
}

function generateMovesForSquare(index) {
  const piece = getPiece(index);
  if (!piece) return [];
  const moves = [];
  const { file, rank } = indexToCoord(index);
  const whitePiece = isWhite(piece);

  if (piece.toUpperCase() === "P") {
    const dir = whitePiece ? 1 : -1;
    const startRank = whitePiece ? 1 : 6;
    const promoRank = whitePiece ? 7 : 0;

    const forwardRank = rank + dir;
    if (inBounds(file, forwardRank)) {
      const fIdx = coordToIndex(file, forwardRank);
      if (!getPiece(fIdx)) {
        if (forwardRank === promoRank) {
          const promoPiece = whitePiece ? "Q" : "q";
          addMoveIfLegal(moves, index, fIdx, promoPiece);
        } else {
          addMoveIfLegal(moves, index, fIdx);
        }

        if (rank === startRank) {
          const twoRank = rank + 2 * dir;
          const tIdx = coordToIndex(file, twoRank);
          if (!getPiece(tIdx)) {
            addMoveIfLegal(moves, index, tIdx);
          }
        }
      }
    }

    for (const df of [-1, 1]) {
      const cf = file + df;
      const cr = rank + dir;
      if (!inBounds(cf, cr)) continue;
      const cIdx = coordToIndex(cf, cr);
      const target = getPiece(cIdx);
      if (target && isWhite(target) !== whitePiece) {
        if (cr === promoRank) {
          const promoPiece = whitePiece ? "Q" : "q";
          addMoveIfLegal(moves, index, cIdx, promoPiece);
        } else {
          addMoveIfLegal(moves, index, cIdx);
        }
      }
    }
  } else if (piece.toUpperCase() === "N") {
    const offsets = [
      [1,2],[2,1],[2,-1],[1,-2],
      [-1,-2],[-2,-1],[-2,1],[-1,2]
    ];
    for (const [df,dr] of offsets) {
      const nf = file + df;
      const nr = rank + dr;
      if (!inBounds(nf, nr)) continue;
      const idx = coordToIndex(nf, nr);
      const target = getPiece(idx);
      if (!target || isWhite(target) !== whitePiece) {
        addMoveIfLegal(moves, index, idx);
      }
    }
  } else if (piece.toUpperCase() === "B" || piece.toUpperCase() === "R" || piece.toUpperCase() === "Q") {
    const directions = [];
    if (piece.toUpperCase() === "B" || piece.toUpperCase() === "Q") {
      directions.push([1,1],[1,-1],[-1,1],[-1,-1]);
    }
    if (piece.toUpperCase() === "R" || piece.toUpperCase() === "Q") {
      directions.push([1,0],[-1,0],[0,1],[0,-1]);
    }

    for (const [df,dr] of directions) {
      let nf = file + df;
      let nr = rank + dr;
      while (inBounds(nf, nr)) {
        const idx = coordToIndex(nf, nr);
        const target = getPiece(idx);
        if (!target) {
          addMoveIfLegal(moves, index, idx);
        } else {
          if (isWhite(target) !== whitePiece) {
            addMoveIfLegal(moves, index, idx);
          }
          break;
        }
        nf += df;
        nr += dr;
      }
    }
  } else if (piece.toUpperCase() === "K") {
    const kingOffsets = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [df,dr] of kingOffsets) {
      const nf = file + df;
      const nr = rank + dr;
      if (!inBounds(nf, nr)) continue;
      const idx = coordToIndex(nf, nr);
      const t = getPiece(idx);
      if (!t || isWhite(t) !== whitePiece) {
        addMoveIfLegal(moves, index, idx);
      }
    }
    // Castling – omitted for brevity; can be added similarly and checked with addMoveIfLegal.
  }

  return moves;
}

function generateLegalMoves(forWhite) {
  const moves = [];
  for (let i = 0; i < 64; i++) {
    const p = getPiece(i);
    if (!p) continue;
    if (isWhite(p) !== forWhite) continue;
    const pieceMoves = generateMovesForSquare(i);
    moves.push(...pieceMoves);
  }
  return moves;
}

// Making moves

function makeMove(move) {
  // Play move / landing sound
  if (moveSound) {
    moveSound.currentTime = 0;
    moveSound.play().catch(() => {});
  }

  const movingPiece = getPiece(move.from);
  const captured = getPiece(move.to);

  setPiece(move.from, null);
  setPiece(move.to, movingPiece);

  if (move.promotion) {
    setPiece(move.to, move.promotion);
  }

  moveHistory.push(move);
  whiteToMove = !whiteToMove;

  renderBoard();
  renderMoveLog();
  updateStatus();

  if (!timerInterval) startTimer();

  if (vsComputer && !whiteToMove) {
    setTimeout(makeComputerMove, 500);
  }
}

function makeComputerMove() {
  const moves = generateLegalMoves(false);
  if (moves.length === 0) return;
  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  makeMove(randomMove);
}

// Rendering

function renderBoard() {
  boardElement.innerHTML = "";
  filesElement.innerHTML = "";
  ranksElement.innerHTML = "";

  for (let i = 0; i < 8; i++) {
    const fSpan = document.createElement("span");
    fSpan.textContent = FILES[i];
    filesElement.appendChild(fSpan);

    const rSpan = document.createElement("span");
    rSpan.textContent = RANKS[i];
    ranksElement.appendChild(rSpan);
  }

  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const displayFile = flipped ? 7 - file : file;
      const displayRank = flipped ? 7 - rank : rank;
      const index = coordToIndex(displayFile, displayRank);
      const square = document.createElement("div");
      square.classList.add("square");
      const isLight = (file + rank) % 2 === 0;
      square.classList.add(isLight ? "light" : "dark");
      square.dataset.index = index;

      if (selectedSquare === index) {
        square.classList.add("selected");
      }

      if (legalMoves.some(m => m.to === index)) {
        square.classList.add("highlight");
      }

      const piece = getPiece(index);
      if (piece) {
        const span = document.createElement("span");
        span.classList.add("piece");
        span.textContent = PIECE_UNICODE[piece];
        square.appendChild(span);
      }

      boardElement.appendChild(square);
    }
  }
}

function renderMoveLog() {
  moveLogElement.innerHTML = "";
  for (let i = 0; i < moveHistory.length; i += 2) {
    const row = document.createElement("div");
    row.classList.add("move-row");

    const indexSpan = document.createElement("span");
    indexSpan.classList.add("move-index");
    indexSpan.textContent = (i / 2 + 1) + ".";
    row.appendChild(indexSpan);

    const pairSpan = document.createElement("span");
    pairSpan.classList.add("move-pair");

    const whiteMove = moveHistory[i];
    const whiteSpan = document.createElement("span");
    whiteSpan.textContent = formatMove(whiteMove);
    pairSpan.appendChild(whiteSpan);

    const blackMove = moveHistory[i + 1];
    if (blackMove) {
      const blackSpan = document.createElement("span");
      blackSpan.textContent = formatMove(blackMove);
      pairSpan.appendChild(blackSpan);
    }

    row.appendChild(pairSpan);
    moveLogElement.appendChild(row);
  }
}

function formatMove(move) {
  const from = indexToCoord(move.from);
  const to = indexToCoord(move.to);
  const fromStr = FILES[from.file] + RANKS[from.rank];
  const toStr = FILES[to.file] + RANKS[to.rank];
  return fromStr + "-" + toStr;
}

function updateStatus() {
  const forWhite = whiteToMove;
  const moves = generateLegalMoves(forWhite);
  const inCheck = isKingInCheck(board, forWhite);
  if (moves.length === 0) {
    if (inCheck) {
      if (statusElement) statusElement.textContent = (forWhite ? "White" : "Black") + " is checkmated.";
      stopTimer();
    } else {
      if (statusElement) statusElement.textContent = "Stalemate.";
      stopTimer();
    }
  } else if (inCheck) {
    if (statusElement) statusElement.textContent = (forWhite ? "White" : "Black") + " is in check.";
  } else {
    if (statusElement) statusElement.textContent = (forWhite ? "White" : "Black") + " to move.";
  }
}

// Input

function onSquareClick(e) {
  // Play basic click on any board tap
  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  }

  if (!currentUser || (currentUser.role === "child" && !allowPlay)) {
    if (statusElement) statusElement.textContent = "Play blocked by parental controls.";
    return;
  }

  const target = e.target.closest(".square");
  if (!target) return;

  const index = parseInt(target.dataset.index, 10);
  const piece = getPiece(index);

  if (selectedSquare !== null) {
    const move = legalMoves.find(m => m.to === index);
    if (move) {
      makeMove(move);
      selectedSquare = null;
      legalMoves = [];
      renderBoard();
      return;
    }
  }

  if (!piece) {
    selectedSquare = null;
    legalMoves = [];
    renderBoard();
    return;
  }

  if (isWhite(piece) !== whiteToMove) {
    selectedSquare = null;
    legalMoves = [];
    renderBoard();
    return;
  }

  selectedSquare = index;
  legalMoves = generateMovesForSquare(index);
  renderBoard();
}

function flipBoard() {
  flipped = !flipped;
  renderBoard();
}

// Event wiring

boardElement.addEventListener("click", onSquareClick);

if (newGameBtn) {
  newGameBtn.addEventListener("click", resetBoard);
}
if (flipBoardBtn) {
  flipBoardBtn.addEventListener("click", flipBoard);
}

// Auto-start for allowed users
if (currentUser && (currentUser.role === "parent" || allowPlay)) {
  resetBoard();
}
