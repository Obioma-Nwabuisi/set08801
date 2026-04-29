// script.js
// Chess board, moves, simple engine, timers, sounds, captured display, castling, rewards.
// Requires auth.js globals: currentUser, allowPlay, statusElement.

const boardElement = document.getElementById("board");
const filesElement = document.getElementById("files");
const ranksElement = document.getElementById("ranks");
const moveLogElement = document.getElementById("moveLog");
const whiteClockElement = document.getElementById("whiteClock");
const blackClockElement = document.getElementById("blackClock");
const whiteCapturedElement = document.getElementById("whiteCaptured");
const blackCapturedElement = document.getElementById("blackCaptured");
const newGameBtn = document.getElementById("newGameBtn");
const flipBoardBtn = document.getElementById("flipBoardBtn");

//Sound effects
const clickSound = new Audio("sounds/sounds-click.mpeg");
const moveSound = new Audio("sounds/sounds-move.mpeg");


function playSound(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

const PIECE_UNICODE = {
  P: "\u2659", N: "\u2658", B: "\u2657", R: "\u2656", Q: "\u2655", K: "\u2654",
  p: "\u265F", n: "\u265E", b: "\u265D", r: "\u265C", q: "\u265B", k: "\u265A"
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

let whiteTime = 10 * 60;
let blackTime = 10 * 60;
let timerInterval = null;

const vsComputer = true;

let whiteCapturedPieces = [];
let blackCapturedPieces = [];

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

function cloneBoard(srcBoard) {
  return srcBoard.slice();
}

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

function resetBoard() {
  board = new Array(64).fill(null);
  const backRankWhite = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  const backRankBlack = ["r", "n", "b", "q", "k", "b", "n", "r"];

  for (let f = 0; f < 8; f++) {
    setPiece(coordToIndex(f, 0), backRankWhite[f]);
    setPiece(coordToIndex(f, 1), "P");
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

  whiteTime = 10 * 60;
  blackTime = 10 * 60;

  whiteCapturedPieces = [];
  blackCapturedPieces = [];

  stopTimer();
  startTimer();
  updateClocks();
  renderBoard();
  renderMoveLog();
  renderCaptured();
  updateStatus();
  playSound(startSound);

  if (typeof renderRewardsUI === "function") renderRewardsUI();
}

function isSquareAttackedByColor(boardState, targetIndex, attackerIsWhite) {
  const { file: tf, rank: tr } = indexToCoord(targetIndex);

  const pawnDir = attackerIsWhite ? 1 : -1;
  const pawnRank = tr - pawnDir;
  for (const pf of [tf - 1, tf + 1]) {
    if (!inBounds(pf, pawnRank)) continue;
    const idx = coordToIndex(pf, pawnRank);
    const p = boardState[idx];
    if (!p) continue;
    if (attackerIsWhite && p === "P") return true;
    if (!attackerIsWhite && p === "p") return true;
  }

  const knightOffsets = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
  for (const [df, dr] of knightOffsets) {
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
  for (const [df, dr] of bishopDirs) {
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
  for (const [df, dr] of rookDirs) {
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
  for (const [df, dr] of kingOffsets) {
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

  trialBoard[fromIndex] = null;
  trialBoard[toIndex] = movingPiece;

  if (promotion) {
    trialBoard[toIndex] = promotion;
  }

  if (special === "castleKing") {
    if (movingPiece === "K") {
      trialBoard[coordToIndex(7, 0)] = null;
      trialBoard[coordToIndex(5, 0)] = "R";
    } else if (movingPiece === "k") {
      trialBoard[coordToIndex(7, 7)] = null;
      trialBoard[coordToIndex(5, 7)] = "r";
    }
  }

  if (special === "castleQueen") {
    if (movingPiece === "K") {
      trialBoard[coordToIndex(0, 0)] = null;
      trialBoard[coordToIndex(3, 0)] = "R";
    } else if (movingPiece === "k") {
      trialBoard[coordToIndex(0, 7)] = null;
      trialBoard[coordToIndex(3, 7)] = "r";
    }
  }

  if (!isKingInCheck(trialBoard, isWhite(movingPiece))) {
    moves.push({ from: fromIndex, to: toIndex, promotion, special });
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
          addMoveIfLegal(moves, index, fIdx, whitePiece ? "Q" : "q");
        } else {
          addMoveIfLegal(moves, index, fIdx);
        }
        if (rank === startRank) {
          const tIdx = coordToIndex(file, rank + 2 * dir);
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
          addMoveIfLegal(moves, index, cIdx, whitePiece ? "Q" : "q");
        } else {
          addMoveIfLegal(moves, index, cIdx);
        }
      }
    }
  } else if (piece.toUpperCase() === "N") {
    const offsets = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
    for (const [df, dr] of offsets) {
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

    for (const [df, dr] of directions) {
      let nf = file + df;
      let nr = rank + dr;
      while (inBounds(nf, nr)) {
        const idx = coordToIndex(nf, nr);
        const target = getPiece(idx);
        if (!target) {
          addMoveIfLegal(moves, index, idx);
        } else {
          if (isWhite(target) !== whitePiece) addMoveIfLegal(moves, index, idx);
          break;
        }
        nf += df;
        nr += dr;
      }
    }
  } else if (piece.toUpperCase() === "K") {
    const kingOffsets = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [df, dr] of kingOffsets) {
      const nf = file + df;
      const nr = rank + dr;
      if (!inBounds(nf, nr)) continue;
      const idx = coordToIndex(nf, nr);
      const target = getPiece(idx);
      if (!target || isWhite(target) !== whitePiece) {
        addMoveIfLegal(moves, index, idx);
      }
    }

    if (whitePiece) {
      if (
        index === coordToIndex(4, 0) &&
        whiteCanCastleKing &&
        getPiece(coordToIndex(5, 0)) === null &&
        getPiece(coordToIndex(6, 0)) === null &&
        getPiece(coordToIndex(7, 0)) === "R" &&
        !isKingInCheck(board, true) &&
        !isSquareAttackedByColor(board, coordToIndex(5, 0), false) &&
        !isSquareAttackedByColor(board, coordToIndex(6, 0), false)
      ) {
        addMoveIfLegal(moves, index, coordToIndex(6, 0), null, "castleKing");
      }

      if (
        index === coordToIndex(4, 0) &&
        whiteCanCastleQueen &&
        getPiece(coordToIndex(1, 0)) === null &&
        getPiece(coordToIndex(2, 0)) === null &&
        getPiece(coordToIndex(3, 0)) === null &&
        getPiece(coordToIndex(0, 0)) === "R" &&
        !isKingInCheck(board, true) &&
        !isSquareAttackedByColor(board, coordToIndex(3, 0), false) &&
        !isSquareAttackedByColor(board, coordToIndex(2, 0), false)
      ) {
        addMoveIfLegal(moves, index, coordToIndex(2, 0), null, "castleQueen");
      }
    } else {
      if (
        index === coordToIndex(4, 7) &&
        blackCanCastleKing &&
        getPiece(coordToIndex(5, 7)) === null &&
        getPiece(coordToIndex(6, 7)) === null &&
        getPiece(coordToIndex(7, 7)) === "r" &&
        !isKingInCheck(board, false) &&
        !isSquareAttackedByColor(board, coordToIndex(5, 7), true) &&
        !isSquareAttackedByColor(board, coordToIndex(6, 7), true)
      ) {
        addMoveIfLegal(moves, index, coordToIndex(6, 7), null, "castleKing");
      }

      if (
        index === coordToIndex(4, 7) &&
        blackCanCastleQueen &&
        getPiece(coordToIndex(1, 7)) === null &&
        getPiece(coordToIndex(2, 7)) === null &&
        getPiece(coordToIndex(3, 7)) === null &&
        getPiece(coordToIndex(0, 7)) === "r" &&
        !isKingInCheck(board, false) &&
        !isSquareAttackedByColor(board, coordToIndex(3, 7), true) &&
        !isSquareAttackedByColor(board, coordToIndex(2, 7), true)
      ) {
        addMoveIfLegal(moves, index, coordToIndex(2, 7), null, "castleQueen");
      }
    }
  }

  return moves;
}

function generateLegalMoves(forWhite) {
  const moves = [];
  for (let i = 0; i < 64; i++) {
    const p = getPiece(i);
    if (!p) continue;
    if (isWhite(p) !== forWhite) continue;
    moves.push(...generateMovesForSquare(i));
  }
  return moves;
}

function renderCaptured() {
  if (!whiteCapturedElement || !blackCapturedElement) return;

  whiteCapturedElement.innerHTML = blackCapturedPieces.map(p => PIECE_UNICODE[p]).join(" ");
  blackCapturedElement.innerHTML = whiteCapturedPieces.map(p => PIECE_UNICODE[p]).join(" ");
}

function makeMove(move) {
  const movingPiece = getPiece(move.from);
  const captured = getPiece(move.to);

  if (captured) {
    playSound(captureSound);
  } else {
    playSound(moveSound);
  }

  if (captured) {
    if (isWhite(captured)) {
      whiteCapturedPieces.push(captured);
    } else {
      blackCapturedPieces.push(captured);
    }

    if (typeof markRewardMilestone === "function" && typeof unlockSticker === "function" && typeof addCoins === "function") {
      if (markRewardMilestone("firstCapture")) {
        unlockSticker("firstCapture");
        addCoins(5);
      }
    }
  }

  if (captured === "R") {
    if (move.to === coordToIndex(0, 0)) whiteCanCastleQueen = false;
    if (move.to === coordToIndex(7, 0)) whiteCanCastleKing = false;
  }
  if (captured === "r") {
    if (move.to === coordToIndex(0, 7)) blackCanCastleQueen = false;
    if (move.to === coordToIndex(7, 7)) blackCanCastleKing = false;
  }

  setPiece(move.from, null);
  setPiece(move.to, movingPiece);

  if (move.promotion) {
    setPiece(move.to, move.promotion);
  }

  if (move.special === "castleKing") {
    if (movingPiece === "K") {
      setPiece(coordToIndex(7, 0), null);
      setPiece(coordToIndex(5, 0), "R");
    } else if (movingPiece === "k") {
      setPiece(coordToIndex(7, 7), null);
      setPiece(coordToIndex(5, 7), "r");
    }
  }

  if (move.special === "castleQueen") {
    if (movingPiece === "K") {
      setPiece(coordToIndex(0, 0), null);
      setPiece(coordToIndex(3, 0), "R");
    } else if (movingPiece === "k") {
      setPiece(coordToIndex(0, 7), null);
      setPiece(coordToIndex(3, 7), "r");
    }
  }

  if (movingPiece === "K") {
    whiteCanCastleKing = false;
    whiteCanCastleQueen = false;
  }
  if (movingPiece === "k") {
    blackCanCastleKing = false;
    blackCanCastleQueen = false;
  }
  if (movingPiece === "R") {
    if (move.from === coordToIndex(0, 0)) whiteCanCastleQueen = false;
    if (move.from === coordToIndex(7, 0)) whiteCanCastleKing = false;
  }
  if (movingPiece === "r") {
    if (move.from === coordToIndex(0, 7)) blackCanCastleQueen = false;
    if (move.from === coordToIndex(7, 7)) blackCanCastleKing = false;
  }

  if (move.special === "castleKing" || move.special === "castleQueen") {
    if (typeof markRewardMilestone === "function" && typeof unlockSticker === "function" && typeof addCoins === "function") {
      if (markRewardMilestone("firstCastle")) {
        unlockSticker("firstCastle");
        addCoins(5);
      }
    }
  }

  moveHistory.push(move);
  whiteToMove = !whiteToMove;

  renderBoard();
  renderMoveLog();
  renderCaptured();
  updateStatus();

  const inCheckNow = isKingInCheck(board, whiteToMove);
  if (inCheckNow) {
    playSound(checkSound);
    if (typeof markRewardMilestone === "function" && typeof unlockSticker === "function" && typeof addCoins === "function") {
      if (markRewardMilestone("firstCheck")) {
        unlockSticker("firstCheck");
        addCoins(5);
      }
    }
  }

  const nextMoves = generateLegalMoves(whiteToMove);
  if (nextMoves.length === 0) {
    const sideInCheck = isKingInCheck(board, whiteToMove);
    if (sideInCheck && !whiteToMove) {
      if (typeof markRewardMilestone === "function" && typeof unlockSticker === "function" && typeof addCoins === "function") {
        if (markRewardMilestone("firstWin")) {
          unlockSticker("firstWin");
          addCoins(15);
        }
      }
    }
  }

  if (!timerInterval) startTimer();
  if (typeof renderRewardsUI === "function") renderRewardsUI();

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
      square.classList.add((file + rank) % 2 === 0 ? "light" : "dark");
      square.dataset.index = index;

      if (selectedSquare === index) square.classList.add("selected");
      if (legalMoves.some(m => m.to === index)) square.classList.add("highlight");

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
  if (!move) return "";
  if (move.special === "castleKing") return "O-O";
  if (move.special === "castleQueen") return "O-O-O";

  const from = indexToCoord(move.from);
  const to = indexToCoord(move.to);
  return FILES[from.file] + RANKS[from.rank] + "-" + FILES[to.file] + RANKS[to.rank];
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

function onSquareClick(e) {
  playSound(clickSound);

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

  if (vsComputer && !whiteToMove) return;

  selectedSquare = index;
  legalMoves = generateMovesForSquare(index);
  renderBoard();
}

function flipBoard() {
  flipped = !flipped;
  renderBoard();
}

boardElement.addEventListener("click", onSquareClick);

if (newGameBtn) newGameBtn.addEventListener("click", resetBoard);
if (flipBoardBtn) flipBoardBtn.addEventListener("click", flipBoard);

if (currentUser && (currentUser.role === "parent" || allowPlay)) {
  resetBoard();
}