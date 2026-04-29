// rewards.js
// Stores coins, stickers, and pets in localStorage.

const REWARDS_STORAGE_KEY = "reading_chess_rewards";

const PETS_CATALOG = [
  { id: "cat", name: "Cat", emoji: "🐱", cost: 0 },
  { id: "owl", name: "Owl", emoji: "🦉", cost: 25 },
  { id: "dog", name: "Dog", emoji: "🐶", cost: 30 },
  { id: "dragon", name: "Dragon", emoji: "🐉", cost: 50 }
];

const STICKER_CATALOG = {
  storyHero: { id: "storyHero", name: "Story Hero", emoji: "📚" },
  firstQuiz: { id: "firstQuiz", name: "First Quiz", emoji: "✅" },
  firstCapture: { id: "firstCapture", name: "First Capture", emoji: "⚔️" },
  firstCheck: { id: "firstCheck", name: "First Check", emoji: "👑" },
  firstCastle: { id: "firstCastle", name: "First Castle", emoji: "🏰" },
  firstWin: { id: "firstWin", name: "First Win", emoji: "🏆" }
};

function getDefaultRewards() {
  return {
    coins: 0,
    stickers: [],
    petsOwned: ["cat"],
    activePet: "cat",
    milestones: {
      firstQuiz: false,
      firstCapture: false,
      firstCheck: false,
      firstCastle: false,
      firstWin: false,
      firstStory: false
    }
  };
}

function saveRewards(state) {
  localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(state));
}

function loadRewards() {
  const raw = localStorage.getItem(REWARDS_STORAGE_KEY);

  if (!raw) {
    const initial = getDefaultRewards();
    saveRewards(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultRewards(),
      ...parsed,
      milestones: {
        ...getDefaultRewards().milestones,
        ...(parsed.milestones || {})
      }
    };
  } catch (error) {
    const initial = getDefaultRewards();
    saveRewards(initial);
    return initial;
  }
}

function addCoins(amount) {
  const state = loadRewards();
  state.coins += amount;
  saveRewards(state);
  renderRewardsUI();
  showRewardPopup(`+${amount} coins`);
}

function spendCoins(amount) {
  const state = loadRewards();
  if (state.coins < amount) return false;
  state.coins -= amount;
  saveRewards(state);
  renderRewardsUI();
  return true;
}

function hasSticker(stickerId) {
  return loadRewards().stickers.includes(stickerId);
}

function unlockSticker(stickerId) {
  const state = loadRewards();
  if (!state.stickers.includes(stickerId)) {
    state.stickers.push(stickerId);
    saveRewards(state);

    const sticker = STICKER_CATALOG[stickerId];
    if (sticker) {
      showRewardPopup(`Sticker unlocked: ${sticker.emoji} ${sticker.name}`);
    }
    renderRewardsUI();
  }
}

function ownsPet(petId) {
  return loadRewards().petsOwned.includes(petId);
}

function unlockPet(petId) {
  const state = loadRewards();
  if (!state.petsOwned.includes(petId)) {
    state.petsOwned.push(petId);
    if (!state.activePet) {
      state.activePet = petId;
    }
    saveRewards(state);
    const pet = PETS_CATALOG.find(p => p.id === petId);
    if (pet) {
      showRewardPopup(`Pet unlocked: ${pet.emoji} ${pet.name}`);
    }
    renderRewardsUI();
  }
}

function buyPet(petId) {
  const pet = PETS_CATALOG.find(p => p.id === petId);
  if (!pet) return false;
  if (ownsPet(petId)) {
    setActivePet(petId);
    return true;
  }
  if (!spendCoins(pet.cost)) {
    showRewardPopup("Not enough coins");
    return false;
  }
  unlockPet(petId);
  setActivePet(petId);
  return true;
}

function setActivePet(petId) {
  const state = loadRewards();
  if (!state.petsOwned.includes(petId)) return;
  state.activePet = petId;
  saveRewards(state);
  renderRewardsUI();
}

function markRewardMilestone(key) {
  const state = loadRewards();
  if (state.milestones[key]) return false;
  state.milestones[key] = true;
  saveRewards(state);
  return true;
}

function getActivePet() {
  const state = loadRewards();
  return PETS_CATALOG.find(p => p.id === state.activePet) || null;
}

function showRewardPopup(message) {
  const container = document.getElementById("rewardPopupContainer");
  if (!container) return;

  const popup = document.createElement("div");
  popup.className = "reward-popup";
  popup.textContent = message;
  container.appendChild(popup);

  setTimeout(() => {
    popup.classList.add("hide");
    setTimeout(() => popup.remove(), 300);
  }, 1800);
}

function renderRewardsUI() {
  const state = loadRewards();

  const coinsCount = document.getElementById("coinsCount");
  const stickersCount = document.getElementById("stickersCount");
  const stickersGrid = document.getElementById("stickersGrid");
  const petsGrid = document.getElementById("petsGrid");
  const activePetLabel = document.getElementById("activePetLabel");
  const activePetPreview = document.getElementById("activePetPreview");
  const whitePetDisplay = document.getElementById("whitePetDisplay");

  if (coinsCount) coinsCount.textContent = String(state.coins);
  if (stickersCount) stickersCount.textContent = String(state.stickers.length);

  const activePet = PETS_CATALOG.find(p => p.id === state.activePet) || null;

  if (activePetLabel) activePetLabel.textContent = activePet ? activePet.name : "None";
  if (activePetPreview) activePetPreview.textContent = activePet ? activePet.emoji : "🐾";
  if (whitePetDisplay) {
    whitePetDisplay.textContent = activePet ? `${activePet.emoji} ${activePet.name}` : "None";
  }

  if (stickersGrid) {
    stickersGrid.innerHTML = "";
    state.stickers.forEach(stickerId => {
      const sticker = STICKER_CATALOG[stickerId];
      if (!sticker) return;
      const item = document.createElement("div");
      item.className = "sticker-item";
      item.title = sticker.name;
      item.textContent = `${sticker.emoji} ${sticker.name}`;
      stickersGrid.appendChild(item);
    });
  }

  if (petsGrid) {
    petsGrid.innerHTML = "";
    PETS_CATALOG.forEach(pet => {
      const owned = state.petsOwned.includes(pet.id);
      const active = state.activePet === pet.id;

      const card = document.createElement("div");
      card.className = "pet-card";

      const name = document.createElement("div");
      name.className = "pet-name";
      name.textContent = `${pet.emoji} ${pet.name}`;

      const price = document.createElement("div");
      price.className = "pet-price";
      price.textContent = owned ? (active ? "Active" : "Owned") : `${pet.cost} coins`;

      const btn = document.createElement("button");
      btn.textContent = owned ? (active ? "Using" : "Use Pet") : "Buy Pet";
      btn.disabled = active;
      btn.addEventListener("click", () => {
        if (owned) {
          setActivePet(pet.id);
        } else {
          buyPet(pet.id);
        }
      });

      card.appendChild(name);
      card.appendChild(price);
      card.appendChild(btn);
      petsGrid.appendChild(card);
    });
  }
}

document.addEventListener("DOMContentLoaded", renderRewardsUI);