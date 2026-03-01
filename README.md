# 🤖 Capybara Simulator — 24/7 Cloud Bot

This bot keeps the Capybara Simulator game open on a cloud server **forever** —
even when your phone is off, your internet is down, or you're asleep.
It earns passive points just by having the page open.

---

## ☁️ Deploy in 5 Minutes (FREE — Railway)

### Step 1 — Create a free GitHub account
Go to https://github.com and sign up (free).

### Step 2 — Create a new repository
1. Click the **+** icon (top right) → **New repository**
2. Name it `capybara-bot`
3. Set it to **Public**
4. Click **Create repository**

### Step 3 — Upload the bot files
1. Click **uploading an existing file** on the repository page
2. Drag and drop ALL the files from this zip into the upload area
3. Click **Commit changes**

### Step 4 — Deploy to Railway (free cloud server)
1. Go to https://railway.app and sign up with your GitHub account
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `capybara-bot`
4. Railway will automatically detect the Dockerfile and deploy it
5. Wait ~3 minutes for the build to finish

### Step 5 — Done! ✅
Your bot is now running 24/7 in the cloud.
- Go to your Railway project → click your service → **Logs** tab
- You'll see messages like: `💓 Still running — uptime: 2h 15m`

---

## 🔄 What the bot does

| Feature | Details |
|---|---|
| Opens the game | Loads your referral link in a headless browser |
| Stays active | Simulates mouse movement every 10 seconds |
| Auto-refreshes | Reloads the page every 30 minutes to prevent expiry |
| Crash recovery | Automatically restarts if anything goes wrong |
| Runs forever | Railway keeps it running even if the server restarts |

---

## 💰 Railway Pricing

Railway gives you **$5 free credit per month**.
This bot uses roughly **~$2–3/month** of resources, so it's **free** or nearly free.

If you want completely free hosting, you can also try:
- **Render.com** → Free tier (spins down after 15 min idle — not ideal)
- **Fly.io** → Free tier with always-on containers

Railway is the best option for this use case.

---

## 🛑 How to stop the bot

In Railway: Go to your service → **Settings** → **Remove service**

---

## 🔧 Customizing

Edit `src/bot.js` to change:
- `REFRESH_EVERY_MS` — how often to refresh the page (default: 30 min)
- `HEARTBEAT_MS` — how often to log status (default: 60 sec)
- `GAME_URL` — change your referral link if needed
