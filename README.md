# Reading Adventure Bundle

A self-contained static web app that combines reading activities, quiz-based progression, rewards, subscriptions, parental controls, and a chess mini-game.

## Included features

- Free vs paid subscription access
- Story worlds with quiz-based completion
- Coins, stickers, and pets saved in browser storage
- Parent and child login flow for demo use
- Parental control toggle for game access
- Chess mini-game with castling support
- Responsive UI with reward popups

## Files

- `index.html` — main app entry point
- `style.css` — app styling
- `auth.js` — demo login, session state, parental controls
- `reading_progress.js` — story completion and chess unlock logic
- `access.js` — free vs premium subscription logic
- `rewards.js` — coins, stickers, pets, reward popups
- `reading_app.js` — story UI, quizzes, world navigation, games hub
- `script.js` — chess logic and reward hooks
- `sounds/` — optional audio files folder

## Optional sounds

The chess script references these files:

- `sounds/click.mp3`
- `sounds/move.mp3`
- `sounds/capture.mp3`
- `sounds/check.mp3`
- `sounds/start.mp3`

If you do not add them, the app should still run, but the browser may log missing audio requests.

## Demo login

- Parent password: `parent123`
- Child password: any value

## Subscription plans

- Free
- Premium Monthly
- Premium Yearly
- Family Licence
- Classroom Licence

The plan switcher is demo-only and stored in `localStorage`.

## Local run

1. Put all files in the same folder.
2. Open `index.html` in a browser.
3. Log in as a child or parent.
4. Use the plan buttons to test free vs premium access.

## Storage keys

The app stores state in browser `localStorage` using JSON strings.

- `reading_app_auth`
- `reading_app_allow_play`
- `reading_app_progress`
- `reading_app_access`
- `reading_chess_rewards`

## Zip-ready structure

```text
reading-adventure-bundle/
├── index.html
├── style.css
├── auth.js
├── reading_progress.js
├── access.js
├── rewards.js
├── reading_app.js
├── script.js
├── README.md
└── sounds/
    └── .gitkeep
```

## Notes

- This is a static prototype, not a production billing or authentication system.
- Subscription switching is simulated locally.
- For production use, replace demo auth and local plan switching with secure backend services.
