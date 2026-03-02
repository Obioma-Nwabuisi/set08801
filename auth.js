// Handles login, logout, parental controls, and app visibility.

// DOM elements
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

// Global auth state (used by chess.js as well)
let currentUser = null; // { username, role: "parent" | "child" }
let allowPlay = true;

// Load & save user state to localStorage
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

// Apply auth/parent state to the UI (called by both auth.js and chess.js)
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

  // Show parent controls only for parents
  if (currentUser.role === "parent") {
    parentPanel.style.display = "block";
  } else {
    parentPanel.style.display = "none";
  }

  // If child and not allowed, hide core chess UI
  const mainLayout = document.querySelector(".main-layout");
  const bottomPanel = document.querySelector(".bottom-panel");

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

// Handle login form submit
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

  // Demo rule: parent password must be "parent123"; child password can be anything
  if (role === "parent" && password !== "parent123") {
    loginError.textContent = "Invalid parent password.";
    return;
  }

  currentUser = { username, role };

  saveUserToStorage();
  applyUserStateToUI();

  // Chess initialisation is handled from chess.js after this script loads
  if (typeof resetBoard === "function" && role !== "child") {
    resetBoard();
  } else if (typeof resetBoard === "function" && role === "child" && allowPlay) {
    resetBoard();
  }
});

// Logout
logoutBtn.addEventListener("click", function () {
  currentUser = null;
  saveUserToStorage();
  applyUserStateToUI();

  if (typeof stopTimer === "function") {
    stopTimer();
  }
});

// Parent toggles allowPlay setting
allowPlayToggle.addEventListener("change", function () {
  allowPlay = allowPlayToggle.checked;
  saveUserToStorage();
  applyUserStateToUI();

  if (currentUser && currentUser.role === "child") {
    if (!allowPlay && typeof stopTimer === "function") {
      stopTimer();
    }
    if (allowPlay && typeof resetBoard === "function") {
      resetBoard();
    }
  }
});

// Initial load: restore stored user + apply
loadUserFromStorage();
applyUserStateToUI();
