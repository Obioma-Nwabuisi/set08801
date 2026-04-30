// access.js
// Free vs paid subscription access model stored in localStorage.

const ACCESS_STORAGE_KEY = "reading_app_access";

function getDefaultAccess() {
  return {
    plan: "free",
    isPremium: false,
    profilesAllowed: 1,
    classroomSeats: 0
  };
}

function saveAccessState(state) {
  localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(state));
}

function loadAccessState() {
  const raw = localStorage.getItem(ACCESS_STORAGE_KEY);
  if (!raw) {
    const initial = getDefaultAccess();
    saveAccessState(initial);
    return initial;
  }

  try {
    return { ...getDefaultAccess(), ...JSON.parse(raw) };
  } catch (error) {
    const initial = getDefaultAccess();
    saveAccessState(initial);
    return initial;
  }
}

function setPlan(plan) {
  const state = getDefaultAccess();

  if (plan === "monthly") {
    state.plan = "monthly";
    state.isPremium = true;
  } else if (plan === "yearly") {
    state.plan = "yearly";
    state.isPremium = true;
  } else if (plan === "family") {
    state.plan = "family";
    state.isPremium = true;
    state.profilesAllowed = 5;
  } else if (plan === "classroom") {
    state.plan = "classroom";
    state.isPremium = true;
    state.profilesAllowed = 30;
    state.classroomSeats = 30;
  }

  saveAccessState(state);
  renderAccessUI();
  if (typeof renderRewardsUI === "function") renderRewardsUI();
}

function hasPremiumAccess() {
  return loadAccessState().isPremium;
}

function getPlanLabel() {
  const plan = loadAccessState().plan;
  const labels = {
    free: "Free",
    monthly: "Premium Monthly",
    yearly: "Premium Yearly",
    family: "Family Licence",
    classroom: "Classroom Licence"
  };
  return labels[plan] || "Free";
}

function canAccessWorld(worldId) {
  if (worldId === "pirateCove") return true;
  return hasPremiumAccess();
}

function canUsePremiumPet(petId) {
  const freePets = ["cat"];
  if (freePets.includes(petId)) return true;
  return hasPremiumAccess();
}

function renderAccessUI() {
  const state = loadAccessState();
  const planBadge = document.getElementById("planBadge");
  const planButtons = document.querySelectorAll(".plan-btn");
  const worldButtons = document.querySelectorAll(".start-story-btn");
  const advancedGamesBtn = document.getElementById("advancedGamesBtn");
  const advancedGamesLockLabel = document.getElementById("advancedGamesLockLabel");
  const advancedGamesCardText = document.getElementById("advancedGamesCardText");

  if (planBadge) {
    planBadge.textContent = getPlanLabel();
    planBadge.className = state.isPremium ? "plan-badge premium-plan" : "plan-badge free-plan";
  }

  planButtons.forEach(btn => {
    btn.classList.toggle("active-plan", btn.dataset.plan === state.plan);
  });

  worldButtons.forEach(btn => {
    const worldId = btn.getAttribute("data-world");
    const allowed = canAccessWorld(worldId);
    btn.disabled = !allowed;
    btn.textContent = allowed ? "Start Chapter 1" : "Premium Required";
    const card = btn.closest(".world-card");
    if (card) card.classList.toggle("locked-premium", !allowed);
  });

  if (advancedGamesBtn && advancedGamesLockLabel && advancedGamesCardText) {
    if (state.isPremium) {
      advancedGamesBtn.disabled = false;
      advancedGamesBtn.textContent = "Play Premium";
      advancedGamesLockLabel.textContent = "Unlocked";
      advancedGamesCardText.textContent = "Premium plan active. Advanced mini-games and extras are available.";
    } else {
      advancedGamesBtn.disabled = true;
      advancedGamesBtn.textContent = "Premium Only";
      advancedGamesLockLabel.textContent = "Premium";
      advancedGamesCardText.textContent = "Premium plans unlock extra mini-games and personalization.";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".plan-btn").forEach(btn => {
    btn.addEventListener("click", () => setPlan(btn.dataset.plan));
  });
  renderAccessUI();
});
