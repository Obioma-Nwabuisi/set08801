// auth.js
// Simple browser-only auth and parental controls for the Reading Adventure bundle.

const AUTH_STORAGE_KEY = "reading_app_auth";
const ALLOW_PLAY_STORAGE_KEY = "reading_app_allow_play";

let currentUser = null;
let allowPlay = true;
let statusElement = null;

function getDefaultAuthState() {
  return {
    currentUser: null
  };
}

function saveAuthState(state) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

function loadAuthState() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    const initial = getDefaultAuthState();
    saveAuthState(initial);
    return initial;
  }

  try {
    return { ...getDefaultAuthState(), ...JSON.parse(raw) };
  } catch (error) {
    const initial = getDefaultAuthState();
    saveAuthState(initial);
    return initial;
  }
}

function saveAllowPlay(value) {
  localStorage.setItem(ALLOW_PLAY_STORAGE_KEY, JSON.stringify(Boolean(value)));
}

function loadAllowPlay() {
  const raw = localStorage.getItem(ALLOW_PLAY_STORAGE_KEY);
  if (raw === null) {
    saveAllowPlay(true);
    return true;
  }
  try {
    return Boolean(JSON.parse(raw));
  } catch (error) {
    saveAllowPlay(true);
    return true;
  }
}

function setCurrentUser(user) {
  currentUser = user;
  saveAuthState({ currentUser: user });
}

function clearCurrentUser() {
  currentUser = null;
  saveAuthState({ currentUser: null });
}

function updateAuthUI() {
  const loginPanel = document.getElementById("loginPanel");
  const appInner = document.getElementById("appInner");
  const currentUserLabel = document.getElementById("currentUserLabel");
  const parentPanel = document.getElementById("parentPanel");
  const allowPlayToggle = document.getElementById("allowPlayToggle");
  const toGamesHubBtn = document.getElementById("toGamesHubBtn");
  const profileLevel = document.getElementById("profileLevel");

  allowPlay = loadAllowPlay();
  if (allowPlayToggle) allowPlayToggle.checked = allowPlay;

  if (currentUser) {
    if (loginPanel) loginPanel.style.display = "none";
    if (appInner) appInner.style.display = "block";
    if (currentUserLabel) currentUserLabel.textContent = `${currentUser.username} (${currentUser.role})`;
    if (profileLevel) profileLevel.textContent = currentUser.role === "parent" ? "Parent" : "Reader";

    if (parentPanel) {
      parentPanel.style.display = currentUser.role === "parent" ? "block" : "none";
    }

    if (toGamesHubBtn) {
      if (currentUser.role === "child" && !allowPlay) {
        toGamesHubBtn.disabled = true;
      } else {
        toGamesHubBtn.disabled = false;
      }
    }

    if (typeof showWorldMap === "function") {
      showWorldMap();
    }
  } else {
    if (loginPanel) loginPanel.style.display = "block";
    if (appInner) appInner.style.display = "none";
  }
}

function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const loginError = document.getElementById("loginError");

  if (!username) {
    if (loginError) loginError.textContent = "Enter a username.";
    return;
  }

  if (role === "parent" && password !== "parent123") {
    if (loginError) loginError.textContent = "Parent password is incorrect.";
    return;
  }

  if (loginError) loginError.textContent = "";

  setCurrentUser({ username, role });
  updateAuthUI();
}

function handleLogout() {
  clearCurrentUser();
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  updateAuthUI();
}

document.addEventListener("DOMContentLoaded", () => {
  statusElement = document.getElementById("status");

  const authState = loadAuthState();
  currentUser = authState.currentUser;
  allowPlay = loadAllowPlay();

  const loginForm = document.getElementById("loginForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const allowPlayToggle = document.getElementById("allowPlayToggle");

  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  if (allowPlayToggle) {
    allowPlayToggle.addEventListener("change", (event) => {
      saveAllowPlay(event.target.checked);
      allowPlay = event.target.checked;
      updateAuthUI();
    });
  }

  updateAuthUI();
});
