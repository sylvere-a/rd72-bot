# RD72 Bot

Discord bot for RD72 (TypeScript, discord.js v14). Maintains a pinned **forum index** post listing upcoming/recent events parsed from thread titles (`12 novembre 2026 - Toulouse`).

## Local setup

```bash
cp .env.example .env
# TOKEN, FORUM_CHANNEL_ID, INDEX_THREAD_ID
npm ci
npm run build
npm start
npm test
```

Developer Portal: enable the bot; **Guilds** intent is enough for thread events. Permissions on the forum: View Channel, Read Message History, Send Messages in Threads, Manage Threads (edit the index starter). Message Content Intent is not required for this feature.

## Forum index (manual setup)

1. In your events forum, create a post (e.g. title `Index des events`) and **pin** it.
2. Copy the **thread ID** (Developer Mode) → `INDEX_THREAD_ID`.
3. Set `FORUM_CHANNEL_ID` (sandbox test forum: `1258321779265376266`).
4. Restart the bot; the starter message is replaced with the sorted list.
5. Event threads must match `jour mois année` French titles; optional ` - ville`. Events more than **7 days** in the past are hidden (`PAST_EVENT_GRACE_DAYS`).

## Deploy on VPS (PM2 + Git push)

| Path | Role |
|------|------|
| `/var/www/rd72-bot` | Live app (checkout, `node_modules`, `.env`, built `dist/`) |
| `~/rd72-bot.git` | Bare repo (receives pushes) |

### PM2 (Node 22 for this bot only)

Use an explicit Node 22 interpreter so other bots can stay on Node 18:

```bash
pm2 start /var/www/rd72-bot/dist/index.js --name RD72_Bot \
  --interpreter "$HOME/.nvm/versions/node/v22.17.1/bin/node"
pm2 save
```

After code changes locally: `npm run build` before restart if testing on the server manually.

### `post-receive` hook

After checkout, **build TypeScript** then restart PM2:

```bash
#!/bin/bash
set -e

TARGET="/var/www/rd72-bot"
GIT_DIR="$HOME/rd72-bot.git"
BRANCH="master"
PM2_NAME="RD72_Bot"
NODE22="$HOME/.nvm/versions/node/v22.17.1/bin/node"
NPM22="$HOME/.nvm/versions/node/v22.17.1/bin/npm"

while read -r oldrev newrev ref; do
	if [ "$ref" = "refs/heads/$BRANCH" ]; then
		echo "Deploying $BRANCH to $TARGET ..."
		git --work-tree="$TARGET" --git-dir="$GIT_DIR" checkout -f "$BRANCH"
		cd "$TARGET"
		"$NPM22" ci
		"$NPM22" run build
		pm2 restart "$PM2_NAME" || pm2 start dist/index.js --name "$PM2_NAME" --interpreter "$NODE22"
		pm2 save
		echo "Done."
	else
		echo "Ignoring ref $ref (only $BRANCH deploys here)."
	fi
done
```

Keep **`.env` only on the server** (not in git).

### Deploy from your machine

```bash
git push origin master
git push production master
```

### PM2 useful commands

```bash
pm2 logs RD72_Bot
pm2 restart RD72_Bot
```

## Invite URL

https://discord.com/oauth2/authorize?client_id=732194531939844117&permissions=2252194950769664&integration_type=0&scope=bot+applications.commands
