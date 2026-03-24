// auth.js
// Handles login, logout, parental controls, and app visibility.

const loginPanel = document.getElementById("loginPanel");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const appInner = document.getElementById("appInner");
const currentUserLabel = document.getElementById("currentUserLabel");
const logoutBtn = document.getElementById("logoutBtn");
const parentPanel = document.getElementById("parentPanel");
const allowPlayToggle = document.getElementById("allowPlayToggle");
const statusElement = document.getElementById("status");

const STORAGE_KEY_USER = "chess_user";
const STORAGE_KEY_ALLOW = "chess_allow_play";

let currentUser = null;
let allowPlay = true;

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
  } else {
    currentUser = null;
  }

  allowPlay = allowStr !== "0";
}

function applyUserStateToUI() {
  if (!currentUser) {
    loginPanel.style.display = "block";
    appInner.style.display = "none";
    return;
  }

  loginPanel.style.display = "none";
  appInner.style.display = "block";

  currentUserLabel.textContent = currentUser.username + " (" + currentUser.role + ")";

  if (currentUser.role === "parent") {
    parentPanel.style.display = "block";
  } else {
    parentPanel.style.display = "none";
  }

  const mainLayout = document.getElementById("worldMap");
  const gamesHub = document.getElementById("gamesHub");
  const chessWrapper = document.getElementById("chessWrapper");

  if (currentUser.role === "child" && !allowPlay) {
    if (mainLayout) mainLayout.style.display = "block";
    if (gamesHub) gamesHub.style.display = "none";
    if (chessWrapper) chessWrapper.style.display = "none";
    if (statusElement) statusElement.textContent = "Play blocked by parental controls.";
  }

  allowPlayToggle.checked = allowPlay;
}

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

  currentUser = { username, role };
  saveUserToStorage();
  applyUserStateToUI();

  if (typeof resetBoard === "function") {
    if (role === "child" && !allowPlay) {
      if (typeof stopTimer === "function") stopTimer();
    } else {
      resetBoard();
    }
  }
});

logoutBtn.addEventListener("click", function () {
  currentUser = null;
  saveUserToStorage();
  applyUserStateToUI();
  if (typeof stopTimer === "function") {
    stopTimer();
  }
});

allowPlayToggle.addEventListener("change", function () {
  allowPlay = allowPlayToggle.checked;
  saveUserToStorage();
  applyUserStateToUI();

  if (currentUser && currentUser.role === "child") {
    if (!allowPlay) {
      if (typeof stopTimer === "function") stopTimer();
    } else {
      if (typeof resetBoard === "function") resetBoard();
    }
  }
});

loadUserFromStorage();
applyUserStateToUI();
