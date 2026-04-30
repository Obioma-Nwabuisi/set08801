// reading_app.js

const worldMap = document.getElementById("worldMap");
const storySection = document.getElementById("storySection");
const gamesHub = document.getElementById("gamesHub");
const chessWrapper = document.getElementById("chessWrapper");

const toWorldMapBtn = document.getElementById("toWorldMapBtn");
const toGamesHubBtn = document.getElementById("toGamesHubBtn");
const backFromGamesBtn = document.getElementById("backFromGamesBtn");
const backFromChessBtn = document.getElementById("backFromChessBtn");

const storyTitleEl = document.getElementById("storyTitle");
const storyTextEl = document.getElementById("storyText");
const readAloudBtn = document.getElementById("readAloudBtn");
const toQuizBtn = document.getElementById("toQuizBtn");
const backToWorldBtn = document.getElementById("backToWorldBtn");

const quizPanel = document.getElementById("quizPanel");
const quizQuestionEl = document.getElementById("quizQuestion");
const quizOptionsEl = document.getElementById("quizOptions");
const submitQuizBtn = document.getElementById("submitQuizBtn");
const quizFeedbackEl = document.getElementById("quizFeedback");

const worldPirateProgressEl = document.getElementById("worldPirateProgress");
const worldEnchantedProgressEl = document.getElementById("worldEnchantedProgress");
const worldSpaceProgressEl = document.getElementById("worldSpaceProgress");
const worldUnderwaterProgressEl = document.getElementById("worldUnderwaterProgress");
const storiesDoneEl = document.getElementById("storiesDone");

const chessCard = document.getElementById("chessCard");
const chessLockLabel = document.getElementById("chessLockLabel");
const chessCardText = document.getElementById("chessCardText");
const playChessBtn = document.getElementById("playChessBtn");

const STORIES = {
  pirateCove: {
    ch1: {
      title: "Pirate Cove - Chapter 1",
      paragraphs: [
        "You stand on the deck of a small ship, the wind tugging at your hat. Captain Ruby points to a distant island.",
        "\"That be Pirate Cove,\" she says. \"Legend says a friendly sea dragon guards a treasure chest there.\"",
        "As you sail closer, you spot something shining near the shore and hear a low rumbling from the waves."
      ],
      quiz: {
        question: "Who guards the treasure at Pirate Cove?",
        options: ["A friendly sea dragon", "A band of robots", "A giant parrot"],
        correctIndex: 0
      }
    }
  },
  enchantedForest: {
    ch1: {
      title: "Enchanted Forest - Chapter 1",
      paragraphs: [
        "You step into a glowing forest where lantern flowers light the path.",
        "A fox in a blue scarf bows and asks for help finding the Moon Key.",
        "Far away, an owl calls from the top of an ancient silver tree."
      ],
      quiz: {
        question: "Who asks for help in the Enchanted Forest?",
        options: ["A fox in a blue scarf", "A sleepy dragon", "A pirate captain"],
        correctIndex: 0
      }
    }
  },
  spaceStation: {
    ch1: {
      title: "Space Station - Chapter 1",
      paragraphs: [
        "You float into the Starbright Station and gently push off the doorway.",
        "Commander Nova explains that the solar panels have stopped turning.",
        "Without power, the station's garden dome may go dark."
      ],
      quiz: {
        question: "What problem does Commander Nova explain?",
        options: ["The station lost its solar power", "The station is full of pirates", "The station found treasure"],
        correctIndex: 0
      }
    }
  },
  underwaterCity: {
    ch1: {
      title: "Underwater City - Chapter 1",
      paragraphs: [
        "You arrive in Coral City inside a bubble tram that glides through the sea.",
        "Mayor Marina welcomes you and points to the dim pearl lights around town.",
        "She says the lights only glow when the song shell is found."
      ],
      quiz: {
        question: "Why is Coral City dim?",
        options: ["The song shell is missing", "A dragon took the treasure", "The forest is too dark"],
        correctIndex: 0
      }
    }
  }
};

let currentWorldId = null;
let currentChapterId = null;

function showWorldMap() {
  worldMap.style.display = "grid";
  storySection.style.display = "none";
  gamesHub.style.display = "none";
  chessWrapper.style.display = "none";

  worldPirateProgressEl.textContent = String(getWorldCompletionPercent("pirateCove"));
  if (worldEnchantedProgressEl) worldEnchantedProgressEl.textContent = String(getWorldCompletionPercent("enchantedForest"));
  if (worldSpaceProgressEl) worldSpaceProgressEl.textContent = String(getWorldCompletionPercent("spaceStation"));
  if (worldUnderwaterProgressEl) worldUnderwaterProgressEl.textContent = String(getWorldCompletionPercent("underwaterCity"));

  storiesDoneEl.textContent = String(getTotalStoriesDone());
  updateGameUnlocks();
  if (typeof renderAccessUI === "function") renderAccessUI();
  if (typeof renderRewardsUI === "function") renderRewardsUI();
}

function showStory(worldId, chapterId) {
  if (typeof canAccessWorld === "function" && !canAccessWorld(worldId)) {
    quizFeedbackEl.textContent = "This story world is for premium plans.";
    if (typeof showRewardPopup === "function") showRewardPopup("Upgrade for premium worlds");
    showWorldMap();
    return;
  }

  currentWorldId = worldId;
  currentChapterId = chapterId;

  const story = STORIES[worldId][chapterId];
  storyTitleEl.textContent = story.title;
  storyTextEl.innerHTML = story.paragraphs.map(p => `<p>${p}</p>`).join("");

  worldMap.style.display = "none";
  storySection.style.display = "grid";
  gamesHub.style.display = "none";
  chessWrapper.style.display = "none";
  quizPanel.style.display = "none";
  quizFeedbackEl.textContent = "";
}

function showGamesHub() {
  worldMap.style.display = "none";
  storySection.style.display = "none";
  chessWrapper.style.display = "none";
  gamesHub.style.display = "block";
  updateGameUnlocks();
  if (typeof renderAccessUI === "function") renderAccessUI();
  if (typeof renderRewardsUI === "function") renderRewardsUI();
}

function showChess() {
  worldMap.style.display = "none";
  storySection.style.display = "none";
  gamesHub.style.display = "none";
  chessWrapper.style.display = "block";

  if (typeof playSound === "function" && typeof startSound !== "undefined") playSound(startSound);
  if (typeof resetBoard === "function") resetBoard();
  if (typeof renderRewardsUI === "function") renderRewardsUI();
}

function readCurrentStoryAloud() {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  const story = STORIES[currentWorldId][currentChapterId];
  const text = story.paragraphs.join(" ");
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function showQuiz() {
  const story = STORIES[currentWorldId][currentChapterId];
  const quiz = story.quiz;

  quizQuestionEl.textContent = quiz.question;
  quizOptionsEl.innerHTML = "";

  quiz.options.forEach((option, idx) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "quizOption";
    input.value = String(idx);
    label.appendChild(input);
    label.appendChild(document.createTextNode(option));
    quizOptionsEl.appendChild(label);
  });

  quizPanel.style.display = "block";
  quizFeedbackEl.textContent = "";
}

function handleQuizSubmit() {
  const story = STORIES[currentWorldId][currentChapterId];
  const quiz = story.quiz;
  const checked = quizOptionsEl.querySelector('input[name="quizOption"]:checked');

  if (!checked) {
    quizFeedbackEl.textContent = "Please choose an answer.";
    return;
  }

  const chosenIndex = parseInt(checked.value, 10);
  const correct = chosenIndex === quiz.correctIndex;

  if (correct) {
    quizFeedbackEl.textContent = "Correct! You finished the chapter and unlocked a reward.";
    markChapterComplete(currentWorldId, currentChapterId, 1);

    storiesDoneEl.textContent = String(getTotalStoriesDone());
    worldPirateProgressEl.textContent = String(getWorldCompletionPercent("pirateCove"));
    if (worldEnchantedProgressEl) worldEnchantedProgressEl.textContent = String(getWorldCompletionPercent("enchantedForest"));
    if (worldSpaceProgressEl) worldSpaceProgressEl.textContent = String(getWorldCompletionPercent("spaceStation"));
    if (worldUnderwaterProgressEl) worldUnderwaterProgressEl.textContent = String(getWorldCompletionPercent("underwaterCity"));

    updateGameUnlocks();

    if (typeof addCoins === "function") addCoins(10);
    if (typeof markRewardMilestone === "function" && typeof unlockSticker === "function") {
      if (markRewardMilestone("firstQuiz")) unlockSticker("firstQuiz");
      if (markRewardMilestone("firstStory")) unlockSticker("storyHero");
    }
    if (typeof renderRewardsUI === "function") renderRewardsUI();
  } else {
    quizFeedbackEl.textContent = "Not quite. Try again or reread the story.";
  }
}

function updateGameUnlocks() {
  const chessUnlocked = getChessUnlocked();

  if (chessUnlocked) {
    chessCard.classList.add("unlocked");
    chessLockLabel.textContent = "Unlocked";
    chessCardText.textContent = "Great job reading! You can now play chess.";
    playChessBtn.disabled = false;
  } else {
    chessCard.classList.remove("unlocked");
    chessLockLabel.textContent = "Locked";
    chessCardText.textContent = "Finish a story and pass the quiz to unlock this game.";
    playChessBtn.disabled = true;
  }
}

toWorldMapBtn.addEventListener("click", showWorldMap);
toGamesHubBtn.addEventListener("click", showGamesHub);
backFromGamesBtn.addEventListener("click", showWorldMap);
backFromChessBtn.addEventListener("click", showGamesHub);
readAloudBtn.addEventListener("click", readCurrentStoryAloud);
toQuizBtn.addEventListener("click", showQuiz);
backToWorldBtn.addEventListener("click", showWorldMap);
submitQuizBtn.addEventListener("click", handleQuizSubmit);

playChessBtn.addEventListener("click", () => {
  if (!getChessUnlocked()) return;
  showChess();
});

Array.from(document.querySelectorAll(".start-story-btn")).forEach(btn => {
  btn.addEventListener("click", () => {
    const worldId = btn.getAttribute("data-world");
    const chapterId = btn.getAttribute("data-chapter");
    showStory(worldId, chapterId);
  });
});

showWorldMap();
