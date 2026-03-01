// Enhanced chess engine & UI.
// Features:
// - Human vs human on one device
// - Legal move generation with check/checkmate detection
// - Pawn promotion
// - Castling
// - Countdown timers
// - Simple computer opponent (Black, random legal move)

const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const moveLogElement = document.getElementById("moveLog");
const filesElement = document.getElementById("files");
const ranksElement = document.getElementById("ranks");
const newGameBtn = document.getElementById("newGameBtn");
const flipBoardBtn = document.getElementById("flipBoardBtn");
const whiteClockElement = document.getElementById("whiteClock");
const blackClockElement = document.getElementById("blackClock");
// Login & parental control elements
const loginPanel = document.getElementById("loginPanel");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const appInner = document.getElementById("appInner");
const currentUserLabel = document.getElementById("currentUserLabel");
const logoutBtn = document.getElementById("logoutBtn");
const parentPanel = document.getElementById("parentPanel");
const allowPlayToggle = document.getElementById("allowPlayToggle");

// Current user / parental control state (front-end only, not secure)
let currentUser = null; // { username, role: "parent" | "child" }
let allowPlay = true;   // if false and role is child, hide chess UI

// Game state
let board = [];
let whiteToMove = true;
let selectedSquare = null;
let legalMoves = [];
let moveHistory = [];
let flipped = false;

// Castling & en passant
let whiteCanCastleKing = true;
let whiteCanCastleQueen = true;
let blackCanCastleKing = true;
let blackCanCastleQueen = true;
let enPassantTarget = null; // index behind a pawn that moved two squares

// Timers (seconds)
let whiteTime = 10 * 60;
let blackTime = 10 * 60;
let timerInterval = null;

const STORAGE_KEY_USER = "chess_user";
const STORAGE_KEY_ALLOW = "chess_allow_play";

function saveUserToStorage() {
  if (currentUser) {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
  } else {
    localStorage.removeItem(STORAGE_KEY_USER);
  }
  localStorage.setItem(STORAGE_KEY_ALLOW, allowPlay ? "1" : "0");
}

function loadUserFromStorage() {
  const userStr = localStorage.getItem(STORAGE_KEY_USER);
  const allowStr = localStorage.getItem(STORAGE_KEY_ALLOW);
  if (userStr) {
    try {
      currentUser = JSON.parse(userStr);
    } catch (e) {
      currentUser = null;
    }
  }
  allowPlay = allowStr !== "0"; // default true
}

function applyUserStateToUI() {
  if (!currentUser) {
    // No one logged in: show login panel, hide chess UI
    loginPanel.style.display = "block";
    appInner.style.display = "none";
    return;
  }

  loginPanel.style.display = "none";
  appInner.style.display = "block";

  currentUserLabel.textContent = currentUser.username + " (" + currentUser.role + ")";

  // Parent panel visible only for parents
  if (currentUser.role === "parent") {
    parentPanel.style.display = "block";
  } else {
    parentPanel.style.display = "none";
  }

  // Parent can decide if a child can see/play chess
  if (currentUser.role === "child" && !allowPlay) {
    // Hide board + controls from child
    document.querySelector(".main-layout").style.display = "none";
    document.querySelector(".bottom-panel").style.display = "none";
    statusElement.textContent = "Play blocked by parental controls.";
  } else {
    document.querySelector(".main-layout").style.display = "";
    document.querySelector(".bottom-panel").style.display = "";
  }

  allowPlayToggle.checked = allowPlay;
}

// Mode: human vs computer (Black)
const vsComputer = true;

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

// Unicode pieces
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
  "k": "\u265A",
};

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

// Initial position
function resetBoard() {
  board = new Array(64).fill(null);
  const backRankWhite = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  const backRankBlack = ["r", "n", "b", "q", "k", "b", "n", "r"];

  // White pieces
  for (let f = 0; f < 8; f++) {
    setPiece(coordToIndex(f, 0), backRankWhite[f]);
    setPiece(coordToIndex(f, 1), "P");
  }

  // Black pieces
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

// Timer functions
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (whiteToMove) {
      whiteTime--;
      if (whiteTime <= 0) {
        whiteTime = 0;
        stopTimer();
        statusElement.textContent = "Black wins on time.";
      }
    } else {
      blackTime--;
      if (blackTime <= 0) {
        blackTime = 0;
        stopTimer();
        statusElement.textContent = "White wins on time.";
      }
    }
    updateClocks();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
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

// Move generation (pseudo-legal, then filtered)
function generateMovesForSquare(index) {
  const piece = getPiece(index);
  if (!piece) return [];
  const moves = [];
  const { file, rank } = indexToCoord(index);
  const isWhitePiece = isWhite(piece);
  const forward = isWhitePiece ? 1 : -1;

  function addMove(toIndex, options = {}) {
    moves.push({
      from: index,
      to: toIndex,
      promotion: options.promotion || null,
      castle: options.castle || null,
      enPassant: options.enPassant || false,
    });
  }

  if (piece.toLowerCase() === "p") {
    const startRank = isWhitePiece ? 1 : 6;
    const promotionRank = isWhitePiece ? 7 : 0;

    // Forward moves
    const oneStepRank = rank + forward;
    if (inBounds(file, oneStepRank)) {
      const oneStepIndex = coordToIndex(file, oneStepRank);
      if (!getPiece(oneStepIndex)) {
        if (oneStepRank === promotionRank) {
          ["Q", "R", "B", "N"].forEach(promo =>
            addMove(oneStepIndex, {
              promotion: isWhitePiece ? promo : promo.toLowerCase(),
            })
          );
        } else {
          addMove(oneStepIndex);
        }
        if (rank === startRank) {
          const twoStepRank = rank + 2 * forward;
          const twoStepIndex = coordToIndex(file, twoStepRank);
          if (!getPiece(twoStepIndex)) {
            addMove(twoStepIndex);
          }
        }
      }
    }

    // Captures
    for (const df of [-1, 1]) {
      const captureFile = file + df;
      const captureRank = rank + forward;
      if (inBounds(captureFile, captureRank)) {
        const captureIndex = coordToIndex(captureFile, captureRank);
        const target = getPiece(captureIndex);
        if (target && ((isWhitePiece && isBlack(target)) || (!isWhitePiece && isWhite(target)))) {
          if (captureRank === promotionRank) {
            ["Q", "R", "B", "N"].forEach(promo =>
              addMove(captureIndex, {
                promotion: isWhitePiece ? promo : promo.toLowerCase(),
              })
            );
          } else {
            addMove(captureIndex);
          }
        }
      }
    }

    // En passant
    if (enPassantTarget !== null) {
      const { file: epFile, rank: epRank } = indexToCoord(enPassantTarget);
      if (epRank === rank + forward && Math.abs(epFile - file) === 1) {
        addMove(enPassantTarget, { enPassant: true });
      }
    }
  } else if (piece.toLowerCase() === "n") {
    const deltas = [
      [1, 2], [2, 1], [-1, 2], [-2, 1],
      [1, -2], [2, -1], [-1, -2], [-2, -1],
    ];
    for (const [df, dr] of deltas) {
      const nf = file + df;
      const nr = rank + dr;
      if (!inBounds(nf, nr)) continue;
      const ni = coordToIndex(nf, nr);
      const target = getPiece(ni);
      if (!target || (isWhitePiece && isBlack(target)) || (!isWhitePiece && isWhite(target))) {
        addMove(ni);
      }
    }
  } else if (["b", "r", "q"].includes(piece.toLowerCase())) {
    const directions = [];
    if (piece.toLowerCase() === "b" || piece.toLowerCase() === "q") {
      directions.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    }
    if (piece.toLowerCase() === "r" || piece.toLowerCase() === "q") {
      directions.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    }

    for (const [df, dr] of directions) {
      let nf = file + df;
      let nr = rank + dr;
      while (inBounds(nf, nr)) {
        const ni = coordToIndex(nf, nr);
        const target = getPiece(ni);
        if (!target) {
          addMove(ni);
        } else {
          if ((isWhitePiece && isBlack(target)) || (!isWhitePiece && isWhite(target))) {
            addMove(ni);
          }
          break;
        }
        nf += df;
        nr += dr;
      }
    }
  } else if (piece.toLowerCase() === "k") {
    // Normal king moves
    const deltas = [];
    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue;
        deltas.push([df, dr]);
      }
    }
    for (const [df, dr] of deltas) {
      const nf = file + df;
      const nr = rank + dr;
      if (!inBounds(nf, nr)) continue;
      const ni = coordToIndex(nf, nr);
      const target = getPiece(ni);
      if (!target || (isWhitePiece && isBlack(target)) || (!isWhitePiece && isWhite(target))) {
        addMove(ni);
      }
    }

    // Castling (simplified: assumes king/rook haven’t moved and ignores check-through squares)
    if (isWhitePiece && rank === 0 && file === 4) {
      // White king side
      if (whiteCanCastleKing &&
          !getPiece(coordToIndex(5, 0)) &&
          !getPiece(coordToIndex(6, 0))) {
        addMove(coordToIndex(6, 0), { castle: "K" });
      }
      // White queen side
      if (whiteCanCastleQueen &&
          !getPiece(coordToIndex(1, 0)) &&
          !getPiece(coordToIndex(2, 0)) &&
          !getPiece(coordToIndex(3, 0))) {
        addMove(coordToIndex(2, 0), { castle: "Q" });
      }
    }
    if (!isWhitePiece && rank === 7 && file === 4) {
      // Black king side
      if (blackCanCastleKing &&
          !getPiece(coordToIndex(5, 7)) &&
          !getPiece(coordToIndex(6, 7))) {
        addMove(coordToIndex(6, 7), { castle: "K" });
      }
      // Black queen side
      if (blackCanCastleQueen &&
          !getPiece(coordToIndex(1, 7)) &&
          !getPiece(coordToIndex(2, 7)) &&
          !getPiece(coordToIndex(3, 7))) {
        addMove(coordToIndex(2, 7), { castle: "Q" });
      }
    }
  }

  return moves;
}

// Apply a move to a given board, return new board + new en passant square
function makeMoveOnBoard(boardState, move, options = {}) {
  const newBoard = cloneBoard(boardState);
  const piece = newBoard[move.from];
  const fromCoord = indexToCoord(move.from);
  const toCoord = indexToCoord(move.to);

  let newEnPassantTarget = null;

  // En passant capture
  if (move.enPassant) {
    const dir = isWhite(piece) ? -1 : 1;
    const capturedRank = toCoord.rank + dir;
    const capturedIndex = coordToIndex(toCoord.file, capturedRank);
    newBoard[capturedIndex] = null;
  }

  // Move piece
  newBoard[move.from] = null;
  let finalPiece = piece;
  if (move.promotion) {
    finalPiece = move.promotion;
  }
  newBoard[move.to] = finalPiece;

  // En passant target square setup
  if (piece.toLowerCase() === "p") {
    if (Math.abs(toCoord.rank - fromCoord.rank) === 2) {
      const middleRank = (toCoord.rank + fromCoord.rank) / 2;
      newEnPassantTarget = coordToIndex(fromCoord.file, middleRank);
    }
  }

  // Handle castling rook move and castle rights
  if (piece.toLowerCase() === "k") {
    if (isWhite(piece)) {
      whiteCanCastleKing = false;
      whiteCanCastleQueen = false;
    } else {
      blackCanCastleKing = false;
      blackCanCastleQueen = false;
    }

    if (move.castle === "K") {
      if (isWhite(piece)) {
        newBoard[coordToIndex(7, 0)] = null;
        newBoard[coordToIndex(5, 0)] = "R";
      } else {
        newBoard[coordToIndex(7, 7)] = null;
        newBoard[coordToIndex(5, 7)] = "r";
      }
    } else if (move.castle === "Q") {
      if (isWhite(piece)) {
        newBoard[coordToIndex(0, 0)] = null;
        newBoard[coordToIndex(3, 0)] = "R";
      } else {
        newBoard[coordToIndex(0, 7)] = null;
        newBoard[coordToIndex(3, 7)] = "r";
      }
    }
  }

  // Rook moves remove relevant castle rights
  if (piece === "R") {
    if (fromCoord.rank === 0 && fromCoord.file === 0) whiteCanCastleQueen = false;
    if (fromCoord.rank === 0 && fromCoord.file === 7) whiteCanCastleKing = false;
  }
  if (piece === "r") {
    if (fromCoord.rank === 7 && fromCoord.file === 0) blackCanCastleQueen = false;
    if (fromCoord.rank === 7 && fromCoord.file === 7) blackCanCastleKing = false;
  }

  // Rook capture also affects castle rights
  if (options.clearCastleRightsForRookCapture) {
    const capturedPiece = boardState[move.to];
    if (capturedPiece === "R") {
      const c = indexToCoord(move.to);
      if (c.rank === 0 && c.file === 0) whiteCanCastleQueen = false;
      if (c.rank === 0 && c.file === 7) whiteCanCastleKing = false;
    }
    if (capturedPiece === "r") {
      const c = indexToCoord(move.to);
      if (c.rank === 7 && c.file === 0) blackCanCastleQueen = false;
      if (c.rank === 7 && c.file === 7) blackCanCastleKing = false;
    }
  }

  return { board: newBoard, enPassantTarget: newEnPassantTarget };
}

function findKing(boardState, white) {
  const target = white ? "K" : "k";
  for (let i = 0; i < 64; i++) {
    if (boardState[i] === target) return i;
  }
  return null;
}

function generateMovesForSquareOnBoard(boardState, index, enPassantIndex) {
  const savedBoard = board;
  const savedEP = enPassantTarget;
  board = boardState;
  enPassantTarget = enPassantIndex;
  const moves = generateMovesForSquare(index);
  board = savedBoard;
  enPassantTarget = savedEP;
  return moves;
}

function isSquareAttacked(boardState, index, byWhite, enPassantIndex) {
  for (let i = 0; i < 64; i++) {
    const piece = boardState[i];
    if (!piece) continue;
    if (byWhite && !isWhite(piece)) continue;
    if (!byWhite && !isBlack(piece)) continue;

    const moves = generateMovesForSquareOnBoard(boardState, i, enPassantIndex);
    if (moves.some(m => m.to === index)) {
      return true;
    }
  }
  return false;
}

function isKingInCheck(boardState, whiteToMoveFlag, enPassantIndex) {
  const kingIndex = findKing(boardState, whiteToMoveFlag);
  if (kingIndex === null) return false;
  return isSquareAttacked(boardState, kingIndex, !whiteToMoveFlag, enPassantIndex);
}

function generateLegalMoves() {
  const moves = [];
  for (let i = 0; i < 64; i++) {
    const piece = getPiece(i);
    if (!piece) continue;
    if (whiteToMove && !isWhite(piece)) continue;
    if (!whiteToMove && !isBlack(piece)) continue;

    const pseudoMoves = generateMovesForSquare(i);
    for (const m of pseudoMoves) {
      const prevCastleRights = {
        wK: whiteCanCastleKing,
        wQ: whiteCanCastleQueen,
        bK: blackCanCastleKing,
        bQ: blackCanCastleQueen,
      };
      const prevEP = enPassantTarget;

      const result = makeMoveOnBoard(board, m, { clearCastleRightsForRookCapture: true });
      const newBoard = result.board;
      const newEP = result.enPassantTarget;

      const inCheck = isKingInCheck(newBoard, whiteToMove, newEP);

      // Restore globals
      whiteCanCastleKing = prevCastleRights.wK;
      whiteCanCastleQueen = prevCastleRights.wQ;
      blackCanCastleKing = prevCastleRights.bK;
      blackCanCastleQueen = prevCastleRights.bQ;
      enPassantTarget = prevEP;

      if (!inCheck) {
        moves.push(m);
      }
    }
  }
  return moves;
}

function isCheckmate() {
  const moves = generateLegalMoves();
  if (moves.length > 0) return false;
  if (!isKingInCheck(board, whiteToMove, enPassantTarget)) return false;
  return true;
}

function isStalemate() {
  const moves = generateLegalMoves();
  if (moves.length > 0) return false;
  if (isKingInCheck(board, whiteToMove, enPassantTarget)) return false;
  return true;
}

// UI rendering
function renderBoard() {
  boardElement.innerHTML = "";

  const fileLabels = flipped ? [...FILES].reverse() : FILES;
  const rankLabels = flipped ? [...RANKS] : [...RANKS].slice().reverse();

  for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
      const displayFile = flipped ? 7 - fileIndex : fileIndex;
      const displayRank = flipped ? rankIndex : 7 - rankIndex;
      const index = coordToIndex(displayFile, displayRank);

      const square = document.createElement("div");
      square.classList.add("square");

      const isLight = (displayFile + displayRank) % 2 === 0;
      square.classList.add(isLight ? "light" : "dark");

      square.dataset.index = index;

      const piece = getPiece(index);
      if (piece) {
        const span = document.createElement("span");
        span.classList.add("piece");
        span.textContent = PIECE_UNICODE[piece];
        square.appendChild(span);
      }

      if (selectedSquare === index) {
        square.classList.add("selected");
      }

      if (legalMoves.some(m => m.from === selectedSquare && m.to === index)) {
        square.classList.add("highlight");
      }

      boardElement.appendChild(square);
    }
  }

  filesElement.innerHTML = "";
  for (const file of fileLabels) {
    const div = document.createElement("div");
    div.textContent = file;
    filesElement.appendChild(div);
  }

  ranksElement.innerHTML = "";
  for (const rank of rankLabels) {
    const div = document.createElement("div");
    div.textContent = rank;
    ranksElement.appendChild(div);
  }
}

function moveToAlgebraic(move, pieceChar, isCapture, checkStatus, mateStatus) {
  if (move.castle === "K") return "O-O" + (mateStatus ? "#" : checkStatus ? "+" : "");
  if (move.castle === "Q") return "O-O-O" + (mateStatus ? "#" : checkStatus ? "+" : "");

  const { file: fromFile, rank: fromRank } = indexToCoord(move.from);
  const { file: toFile, rank: toRank } = indexToCoord(move.to);

  const fromSquare = FILES[fromFile] + RANKS[fromRank];
  const toSquare = FILES[toFile] + RANKS[toRank];

  const pieceLetter = pieceChar.toLowerCase() === "p" ? "" : pieceChar.toUpperCase();
  const captureMark = isCapture ? "x" : "-";

  let suffix = "";
  if (mateStatus) suffix = "#";
  else if (checkStatus) suffix = "+";

  let promo = "";
  if (move.promotion) {
    promo = "=" + move.promotion.toUpperCase();
  }

  return pieceLetter + fromSquare + captureMark + toSquare + promo + suffix;
}

function renderMoveLog() {
  moveLogElement.innerHTML = "";
  for (let i = 0; i < moveHistory.length; i += 2) {
    const row = document.createElement("div");
    row.classList.add("move-row");

    const indexSpan = document.createElement("span");
    indexSpan.classList.add("move-index");
    indexSpan.textContent = (i / 2 + 1) + ".";

    const pair = document.createElement("div");
    pair.classList.add("move-pair");

    const whiteMove = document.createElement("span");
    whiteMove.textContent = moveHistory[i] || "";

    const blackMove = document.createElement("span");
    blackMove.textContent = moveHistory[i + 1] || "";

    pair.appendChild(whiteMove);
    pair.appendChild(blackMove);

    row.appendChild(indexSpan);
    row.appendChild(pair);

    moveLogElement.appendChild(row);
  }

  moveLogElement.scrollTop = moveLogElement.scrollHeight;
}

function updateStatus() {
  if (whiteTime <= 0 || blackTime <= 0) {
    return;
  }
  if (isCheckmate()) {
    const winner = whiteToMove ? "Black" : "White";
    statusElement.textContent = winner + " wins by checkmate.";
    stopTimer();
    return;
  }
  if (isStalemate()) {
    statusElement.textContent = "Game drawn by stalemate.";
    stopTimer();
    return;
  }
  const side = whiteToMove ? "White" : "Black";
  const checkText = isKingInCheck(board, whiteToMove, enPassantTarget) ? " (in check)" : "";
  statusElement.textContent = side + " to move" + checkText + ".";
}

// Human move handling
function onSquareClick(e) {
  // In vs computer mode, user only plays White
  if (vsComputer && !whiteToMove) {
    return;
  }

  const square = e.target.closest(".square");
  if (!square) return;
  const index = parseInt(square.dataset.index, 10);
  const piece = getPiece(index);

  if (selectedSquare === null) {
    if (!piece) return;
    if (whiteToMove && !isWhite(piece)) return;
    if (!whiteToMove && !isBlack(piece)) return;

    selectedSquare = index;
    legalMoves = generateLegalMoves().filter(m => m.from === index);
    renderBoard();
    return;
  }

  if (index === selectedSquare) {
    selectedSquare = null;
    legalMoves = [];
    renderBoard();
    return;
  }

  const move = legalMoves.find(m => m.to === index);
  if (!move) {
    if (piece && ((whiteToMove && isWhite(piece)) || (!whiteToMove && isBlack(piece)))) {
      selectedSquare = index;
      legalMoves = generateLegalMoves().filter(m => m.from === index);
      renderBoard();
    }
    return;
  }

  playMove(move);
}

function playMove(move) {
  const capturedPiece = getPiece(move.to);
  const movingPiece = getPiece(move.from);

  const result = makeMoveOnBoard(board, move, { clearCastleRightsForRookCapture: true });
  board = result.board;
  enPassantTarget = result.enPassantTarget;

  whiteToMove = !whiteToMove;

  const checkStatus = isKingInCheck(board, whiteToMove, enPassantTarget);
  const mateStatus = isCheckmate();

  const notation = moveToAlgebraic(
    move,
    movingPiece,
    !!capturedPiece,
    checkStatus,
    mateStatus
  );
  moveHistory.push(notation);

  selectedSquare = null;
  legalMoves = [];
  renderBoard();
  renderMoveLog();
  updateStatus();

  if (vsComputer &&
      !whiteToMove &&
      whiteTime > 0 &&
      blackTime > 0 &&
      !isCheckmate() &&
      !isStalemate()) {
    setTimeout(computerMove, 400);
  }
}

// Very simple computer: random legal move for Black
function computerMove() {
  if (whiteToMove) return;
  const moves = generateLegalMoves();
  if (moves.length === 0) {
    updateStatus();
    return;
  }
  const randomIndex = Math.floor(Math.random() * moves.length);
  const move = moves[randomIndex];
  playMove(move);
}

function flipBoard() {
  flipped = !flipped;
  renderBoard();
}

// Simple demo credential rules (NOT SECURE, for learning only):
// - If role = "parent": password must be "parent123".
// - If role = "child": any non-empty password is accepted.
loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const username = loginForm.username.value.trim();
  const password = loginForm.password.value;
  const role = loginForm.role.value;

  loginError.textContent = "";

  if (!username || !password) {
    loginError.textContent = "Please enter username and password.";
    return;
  }

  if (role === "parent" && password !== "parent123") {
    loginError.textContent = "Invalid parent password.";
    return;
  }

  // In a real app, you would send this to a backend and verify securely.
  currentUser = { username, role };
  // For new child users, default allowPlay = true; for parents, keep last setting.
  if (role === "child" && allowPlay === undefined) {
    allowPlay = true;
  }

  saveUserToStorage();
  applyUserStateToUI();

  // Start or stop the chess engine depending on role + allowPlay
  if (role === "child" && !allowPlay) {
    stopTimer();
  } else {
    resetBoard();
  }
});

logoutBtn.addEventListener("click", function () {
  currentUser = null;
  stopTimer();
  saveUserToStorage();
  applyUserStateToUI();
});

allowPlayToggle.addEventListener("change", function () {
  allowPlay = allowPlayToggle.checked;
  saveUserToStorage();
  applyUserStateToUI();
  if (currentUser && currentUser.role === "child") {
    if (!allowPlay) {
      stopTimer();
    } else {
      resetBoard();
    }
  }
});

boardElement.addEventListener("click", onSquareClick);
newGameBtn.addEventListener("click", resetBoard);
flipBoardBtn.addEventListener("click", flipBoard);

{
  resetBoard();
}

