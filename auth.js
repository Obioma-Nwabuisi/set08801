// auth.js
// Simple browser-only auth and parental controls for the Reading Adventure bundle.

// ============================================================================
// STORAGE KEYS
// ============================================================================
// Keys for persisting authentication state and parental control settings
const AUTH_STORAGE_KEY = "reading_app_auth";
const ALLOW_PLAY_STORAGE_KEY = "reading_app_allow_play";

// ============================================================================
// STATE VARIABLES
// ============================================================================
// Global state: current logged-in user, parental control flag, and status display element
let currentUser = null;
let allowPlay = true;
let statusElement = null;

// ============================================================================
// DEFAULT STATE
// ============================================================================
// Returns the default authentication state object (no user logged in)
function getDefaultAuthState() {
  return {
    currentUser: null
  };
}

// ============================================================================
// PERSISTENCE: SAVE / LOAD AUTH STATE
// ============================================================================
// Saves the authentication state object to localStorage
function saveAuthState(state) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

// Loads authentication state from localStorage, or returns default if not found or corrupted
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

// ============================================================================
// PERSISTENCE: PARENTAL CONTROL TOGGLE
// ============================================================================
// Saves the parental control flag (allow/disallow gameplay) to localStorage
function saveAllowPlay(value) {
  localStorage.setItem(ALLOW_PLAY_STORAGE_KEY, JSON.stringify(Boolean(value)));
}

// Loads the parental control flag from localStorage, defaults to true (allow play)
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

// ============================================================================
// USER MANAGEMENT
// ============================================================================
// Sets the current user and persists to localStorage
function setCurrentUser(user) {
  currentUser = user;
  saveAuthState({ currentUser: user });
}

// Clears the current user from memory and localStorage
function clearCurrentUser() {
  currentUser = null;
  saveAuthState({ currentUser: null });
}

// ============================================================================
// UI UPDATE
// ============================================================================
// Updates the UI based on current authentication state
// Shows/hides login panel and app based on whether user is logged in
// Displays user info, hides/shows parental controls panel based on user role
// Enables/disables games hub button based on parental controls
function updateAuthUI() {
  const loginPanel = document.getElementById("loginPanel");
  const appInner = document.getElementById("appInner");
  const currentUserLabel = document.getElementById("currentUserLabel");
  const parentPanel = document.getElementById("parentPanel");
  const allowPlayToggle = document.getElementById("allowPlayToggle");
  const toGamesHubBtn = document.getElementById("toGamesHubBtn");
  const profileLevel = document.getElementById("profileLevel");

  // Load current parental control state
  allowPlay = loadAllowPlay();
  if (allowPlayToggle) allowPlayToggle.checked = allowPlay;

  // If user is logged in, show app and hide login
  if (currentUser) {
    if (loginPanel) loginPanel.style.display = "none";
    if (appInner) appInner.style.display = "block";
    if (currentUserLabel) currentUserLabel.textContent = `${currentUser.username} (${currentUser.role})`;
    if (profileLevel) profileLevel.textContent = currentUser.role === "parent" ? "Parent" : "Reader";

    // Show parental controls panel only for parent users
    if (parentPanel) {
      parentPanel.style.display = currentUser.role === "parent" ? "block" : "none";
    }

    // Disable games hub button if child and gameplay is restricted by parent
    if (toGamesHubBtn) {
      if (currentUser.role === "child" && !allowPlay) {
        toGamesHubBtn.disabled = true;
      } else {
        toGamesHubBtn.disabled = false;
      }
    }

    // Show the world map if function is available
    if (typeof showWorldMap === "function") {
      showWorldMap();
    }
  } else {
    // If not logged in, show login panel and hide app
    if (loginPanel) loginPanel.style.display = "block";
    if (appInner) appInner.style.display = "none";
  }
}

// ============================================================================
// LOGIN HANDLER
// ============================================================================
// Processes login form submission
// Validates username (required) and parent password (demo: "parent123")
// Child login accepts any password for demo purposes
function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const loginError = document.getElementById("loginError");

  // Validate username is not empty
  if (!username) {
    if (loginError) loginError.textContent = "Enter a username.";
    return;
  }

  // Validate parent password (demo password only)
  if (role === "parent" && password !== "parent123") {
    if (loginError) loginError.textContent = "Parent password is incorrect.";
    return;
  }

  // Clear any previous error messages
  if (loginError) loginError.textContent = "";

  // Set user as logged in and update UI
  setCurrentUser({ username, role });
  updateAuthUI();
}

// ============================================================================
// LOGOUT HANDLER
// ============================================================================
// Clears current user session and stops any ongoing speech synthesis
// (used by read-aloud feature)
function handleLogout() {
  clearCurrentUser();
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  updateAuthUI();
}

// ============================================================================
// INITIALIZATION
// ============================================================================
// Runs on page load to set up authentication state and event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Cache the status element for later use by chess or other modules
  statusElement = document.getElementById("status");

  // Load persisted authentication and parental control state
  const authState = loadAuthState();
  currentUser = authState.currentUser;
  allowPlay = loadAllowPlay();

  // Get form and button elements
  const loginForm = document.getElementById("loginForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const allowPlayToggle = document.getElementById("allowPlayToggle");

  // Attach event listeners
  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  if (allowPlayToggle) {
    // When parent toggles parental control, save and update UI
    allowPlayToggle.addEventListener("change", (event) => {
      saveAllowPlay(event.target.checked);
      allowPlay = event.target.checked;
      updateAuthUI();
    });
  }

  // Initialize UI with current auth state
  updateAuthUI();
});
