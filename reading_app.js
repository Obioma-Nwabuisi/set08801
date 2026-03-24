// reading_app.js
// Handles world map, story display, quiz, and game hub unlock wiring.

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
const storiesDoneEl = document.getElementById("storiesDone");

const chessCard = document.getElementById("chessCard");
const chessLockLabel = document.getElementById("chessLockLabel");
const chessCardText = document.getElementById("chessCardText");
const playChessBtn = document.getElementById("playChessBtn");

// Simple inline story + quiz data for Pirate Cove, Chapter 1
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
        options: [
          "A friendly sea dragon",
          "A band of robots",
          "A giant parrot"
        ],
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

  const percent = getWorldCompletionPercent("pirateCove");
  worldPirateProgressEl.textContent = String(percent);
  storiesDoneEl.textContent = String(getTotalStoriesDone());

  updateGameUnlocks();
}

function showStory(worldId, chapterId) {
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
}

function showChess() {
  worldMap.style.display = "none";
  storySection.style.display = "none";
  gamesHub.style.display = "none";
  chessWrapper.style.display = "block";
}

// Web Speech API best-effort read-aloud
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

  quiz.options = quiz.options || [];

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
  const checked = quizOptionsEl.querySelector("input[name='quizOption']:checked");

  if (!checked) {
    quizFeedbackEl.textContent = "Please choose an answer.";
    return;
  }

  const chosenIndex = parseInt(checked.value, 10);
  const correct = chosenIndex === quiz.correctIndex;

  if (correct) {
    quizFeedbackEl.textContent = "Correct! You finished the chapter and unlocked a reward.";
    markChapterComplete(currentWorldId, currentChapterId, 1);
    worldPirateProgressEl.textContent = String(getWorldCompletionPercent("pirateCove"));
    storiesDoneEl.textContent = String(getTotalStoriesDone());
    updateGameUnlocks();
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

// Event wiring
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
  if (typeof resetBoard === "function") {
    resetBoard();
  }
});

// World card start button
Array.from(document.querySelectorAll(".start-story-btn")).forEach(btn => {
  btn.addEventListener("click", () => {
    const worldId = btn.getAttribute("data-world");
    const chapterId = btn.getAttribute("data-chapter");
    showStory(worldId, chapterId);
  });
});

// Initial load
showWorldMap();
