// Handles login, logout, parental controls, and app visibility.

// DOM elements for auth + layout
const loginPanel = document.getElementById("loginPanel");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const appInner = document.getElementById("appInner");
const currentUserLabel = document.getElementById("currentUserLabel");
const logoutBtn = document.getElementById("logoutBtn");
const parentPanel = document.getElementById("parentPanel");
const allowPlayToggle = document.getElementById("allowPlayToggle");
const statusElement = document.getElementById("status");

// Storage keys
const STORAGE_KEY_USER = "chess_user";
const STORAGE_KEY_ALLOW = "chess_allow_play";

// Global auth state (also used by chess.js)
let currentUser = null; // { username, role: "parent" | "child" }
let allowPlay = true;   // whether children can play on this device

// Save user + parental setting to localStorage
function saveUserToStorage() {
  if (currentUser) {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
  } else {
    localStorage.removeItem(STORAGE_KEY_USER);
  }
  localStorage.setItem(STORAGE_KEY_ALLOW, allowPlay ? "1" : "0");
}

// Load user + parental setting from localStorage
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

  allowPlay = allowStr !== "0"; // default true
}

// Apply auth/parental state to the UI
function applyUserStateToUI() {
  if (!currentUser) {
    // No one logged in: show login form, hide app
    loginPanel.style.display = "block";
    appInner.style.display = "none";
    return;
  }

  loginPanel.style.display = "none";
  appInner.style.display = "block";

  currentUserLabel.textContent = currentUser.username + " (" + currentUser.role + ")";

  // Parent controls visible only to parents
  if (currentUser.role === "parent") {
    parentPanel.style.display = "block";
  } else {
    parentPanel.style.display = "none";
  }

  const mainLayout = document.querySelector(".main-layout");
  const bottomPanel = document.querySelector(".bottom-panel");

  // If child is not allowed, hide chess UI
  if (currentUser.role === "child" && !allowPlay) {
    if (mainLayout) mainLayout.style.display = "none";
    if (bottomPanel) bottomPanel.style.display = "none";
    if (statusElement) statusElement.textContent = "Play blocked by parental controls.";
  } else {
    if (mainLayout) mainLayout.style.display = "";
    if (bottomPanel) bottomPanel.style.display = "";
  }

  allowPlayToggle.checked = allowPlay;
}

// DEMO RULES (front‑end only, not secure):
// - Parent: password must be "parent123"
// - Child: any non‑empty password
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

  // Start or stop chess depending on role + allowPlay
  if (typeof resetBoard === "function") {
    if (role === "child" && !allowPlay) {
      if (typeof stopTimer === "function") stopTimer();
    } else {
      resetBoard();
    }
  }
});

// Logout button
logoutBtn.addEventListener("click", function () {
  currentUser = null;
  saveUserToStorage();
  applyUserStateToUI();
  if (typeof stopTimer === "function") {
    stopTimer();
  }
});

// Parent toggles play allowed / blocked
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

// On page load, restore state
loadUserFromStorage();
applyUserStateToUI();
