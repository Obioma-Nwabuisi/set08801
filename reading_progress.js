// reading_progress.js
// Story completion and chess unlock persistence.

const READING_PROGRESS_STORAGE_KEY = "reading_app_progress";

const STORY_WORLDS = {
  pirateCove: ["ch1"],
  enchantedForest: ["ch1"],
  spaceStation: ["ch1"],
  underwaterCity: ["ch1"]
};

function getDefaultReadingProgress() {
  return {
    completed: {
      pirateCove: {},
      enchantedForest: {},
      spaceStation: {},
      underwaterCity: {}
    },
    totalStoriesDone: 0,
    chessUnlocked: false
  };
}

function saveReadingProgress(state) {
  localStorage.setItem(READING_PROGRESS_STORAGE_KEY, JSON.stringify(state));
}

function loadReadingProgress() {
  const raw = localStorage.getItem(READING_PROGRESS_STORAGE_KEY);
  if (!raw) {
    const initial = getDefaultReadingProgress();
    saveReadingProgress(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultReadingProgress(),
      ...parsed,
      completed: {
        ...getDefaultReadingProgress().completed,
        ...(parsed.completed || {})
      }
    };
  } catch (error) {
    const initial = getDefaultReadingProgress();
    saveReadingProgress(initial);
    return initial;
  }
}

function markChapterComplete(worldId, chapterId, score = 1) {
  const state = loadReadingProgress();

  if (!state.completed[worldId]) {
    state.completed[worldId] = {};
  }

  const firstTime = !state.completed[worldId][chapterId];
  state.completed[worldId][chapterId] = {
    done: true,
    score,
    completedAt: new Date().toISOString()
  };

  if (firstTime) {
    state.totalStoriesDone += 1;
  }

  if (state.totalStoriesDone >= 1) {
    state.chessUnlocked = true;
  }

  saveReadingProgress(state);
}

function getWorldCompletionPercent(worldId) {
  const state = loadReadingProgress();
  const chapters = STORY_WORLDS[worldId] || [];
  if (chapters.length === 0) return 0;

  let doneCount = 0;
  chapters.forEach(chapterId => {
    if (state.completed[worldId] && state.completed[worldId][chapterId]?.done) {
      doneCount += 1;
    }
  });

  return Math.round((doneCount / chapters.length) * 100);
}

function getTotalStoriesDone() {
  return loadReadingProgress().totalStoriesDone;
}

function getChessUnlocked() {
  return loadReadingProgress().chessUnlocked;
}

function resetReadingProgress() {
  saveReadingProgress(getDefaultReadingProgress());
}
