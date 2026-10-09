# RD72 Bot

Discord bot for RD72 (discord.js v14).

## Local setup

```bash
cp .env.example .env
# Set TOKEN from the Discord Developer Portal (Bot tab)
npm install
npm start
```

In the [Developer Portal](https://discord.com/developers/applications), enable the bot and invite it with the permissions your features need. For forum/thread work, **Message Content Intent** is only required if you add prefix or plain-text features.

---

## Deploy on Render

Use a **Background Worker**, not a Web Service (free web services sleep; the bot needs a always-on process).

| Setting           | Value                      |
| ----------------- | -------------------------- |
| **Service type**  | Background Worker          |
| **Runtime**       | Node                       |
| **Build command** | `npm ci`                   |
| **Start command** | `npm start`                |
| **Plan**          | Starter (~$7/mo) is enough |

1. Connect the GitHub repo and deploy branch **`master`**.
2. Add environment variable **`TOKEN`** (secret) in the Render dashboard.
3. After deploy, open **Logs** and confirm `Ready as …`.

Render redeploys automatically on each push to the linked branch. Changing `TOKEN` or other env vars triggers a restart of the same service (one worker, no second deploy needed for test vs prod — use env and channel IDs).

---

## Deploy on VPS (PM2 + Git push)

Paths used below:

| Path                | Role                                         |
| ------------------- | -------------------------------------------- |
| `/var/www/rd72-bot` | Live app (checkout, `node_modules`, `.env`)  |
| `~/rd72-bot.git`    | Bare repository on the VPS (receives pushes) |

Adjust usernames/paths if your server layout differs.

### One-time: prepare the VPS

```bash
# App directory
sudo mkdir -p /var/www/rd72-bot
sudo chown "$USER":"$USER" /var/www/rd72-bot

# Bare repo for deploy pushes
git init --bare ~/rd72-bot.git

# First deploy: clone into the app directory (or leave empty and let the hook populate it)
git clone ~/rd72-bot.git /var/www/rd72-bot
cd /var/www/rd72-bot
git checkout master
cp .env.example .env
nano .env   # set TOKEN
npm ci

# PM2
pm2 start /var/www/rd72-bot/index.js --name RD72_Bot
pm2 save
pm2 startup   # run the command it prints so the bot survives reboots
```

### One-time: `post-receive` hook (auto checkout + restart on `master`)

```bash
nano ~/rd72-bot.git/hooks/post-receive
```

```bash
#!/bin/bash
set -e

TARGET="/var/www/rd72-bot"
GIT_DIR="$HOME/rd72-bot.git"
BRANCH="master"
PM2_NAME="RD72_Bot"

while read -r oldrev newrev ref; do
	if [ "$ref" = "refs/heads/$BRANCH" ]; then
		echo "Deploying $BRANCH to $TARGET ..."
		git --work-tree="$TARGET" --git-dir="$GIT_DIR" checkout -f "$BRANCH"
		cd "$TARGET"
		npm ci
		pm2 restart "$PM2_NAME" || pm2 start index.js --name "$PM2_NAME"
		pm2 save
		echo "Done."
	else
		echo "Ignoring ref $ref (only $BRANCH deploys here)."
	fi
done
```

```bash
chmod +x ~/rd72-bot.git/hooks/post-receive
```

The hook checks out **`master`** into `/var/www/rd72-bot`, runs **`npm ci`**, then **`pm2 restart RD72_Bot`** (or starts it if missing).

**Keep `.env` only on the server** — it is not in git. The hook does not overwrite it.

### One-time: add the VPS remote on your machine

From your local clone (same repo):

```bash
git remote add production USER@YOUR_VPS_IP:rd72-bot.git
```

Use the SSH user and host you use to log in (e.g. `ubuntu@203.0.113.10:rd72-bot.git` if the bare repo is `~/rd72-bot.git` on that account).

### Day-to-day deploy

```bash
git push origin master      # GitHub (and Render, if connected)
git push production master  # VPS → hook runs checkout + npm ci + pm2 restart
```

### Useful PM2 commands

```bash
pm2 list
pm2 logs RD72_Bot
pm2 restart RD72_Bot
```

---

## Invite URL

https://discord.com/oauth2/authorize?client_id=732194531939844117&permissions=2252194950769664&integration_type=0&scope=bot+applications.commands
