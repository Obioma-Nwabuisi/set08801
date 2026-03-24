// reading_progress.js
// Simple client-side module to track reading progress and game unlocks.

const RP_STORAGE_KEY = "reading_progress";

function loadReadingProgress() {
  const raw = localStorage.getItem(RP_STORAGE_KEY);
  if (!raw) {
    const initial = {
      profile: { level: "Not set" },
      worlds: {
        pirateCove: {
          chapters: {
            ch1: { completed: false, quizScore: 0 }
          }
        },
        enchantedForest: {
          chapters: {
            ch1: { completed: false, quizScore: 0 }
          }
        },
        spaceStation: {
          chapters: {
            ch1: { completed: false, quizScore: 0 }
          }
        },
        underwaterCity: {
          chapters: {
            ch1: { completed: false, quizScore: 0 }
          }
        }
      },
      gamesUnlocked: {
        chess: false
      }
    };
    localStorage.setItem(RP_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    localStorage.removeItem(RP_STORAGE_KEY);
    return loadReadingProgress();
  }
}

function saveReadingProgress(state) {
  localStorage.setItem(RP_STORAGE_KEY, JSON.stringify(state));
}

function markChapterComplete(worldId, chapterId, quizScore) {
  const state = loadReadingProgress();
  if (!state.worlds[worldId]) state.worlds[worldId] = { chapters: {} };
  if (!state.worlds[worldId].chapters[chapterId]) {
    state.worlds[worldId].chapters[chapterId] = { completed: false, quizScore: 0 };
  }

  state.worlds[worldId].chapters[chapterId].completed = true;
  state.worlds[worldId].chapters[chapterId].quizScore = quizScore;

  unlockChessIfEligible(state);
  saveReadingProgress(state);
  return state;
}

function unlockChessIfEligible(state) {
  // Unlock chess if any chapter in any world has a passing score (>=1)
  for (const worldId of Object.keys(state.worlds)) {
    const world = state.worlds[worldId];
    const chapters = Object.values(world.chapters);
    if (chapters.some(ch => ch.completed && ch.quizScore >= 1)) {
      state.gamesUnlocked.chess = true;
      return;
    }
  }
}

function getChessUnlocked() {
  const state = loadReadingProgress();
  return state.gamesUnlocked.chess === true;
}

function getWorldCompletionPercent(worldId) {
  const state = loadReadingProgress();
  const world = state.worlds[worldId];
  if (!world) return 0;
  const chapters = Object.values(world.chapters);
  if (chapters.length === 0) return 0;
  const done = chapters.filter(c => c.completed).length;
  return Math.round((done / chapters.length) * 100);
}

function getTotalStoriesDone() {
  const state = loadReadingProgress();
  let total = 0;
  for (const worldId of Object.keys(state.worlds)) {
    const world = state.worlds[worldId];
    total += Object.values(world.chapters).filter(c => c.completed).length;
  }
  return total;
}
