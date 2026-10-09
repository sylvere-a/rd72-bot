# RD72 Bot

Discord bot for RD72 (TypeScript, discord.js v14). Maintains a pinned **forum index** post listing upcoming/recent events parsed from thread titles (`12 novembre 2026 - Toulouse`).

## Local setup

```bash
cp .env.example .env
# TOKEN, FORUM_CHANNEL_ID
npm ci
npm run build
npm start
npm test
```

Developer Portal: enable the bot; **Guilds** intent is enough for thread events. Message Content Intent is not required.

**Forum channel permissions (bot role):** View Channel, Read Message History, **Create Public Threads**, Send Messages in Threads, **Manage Threads** (pin the index). The bot **creates** the index post so it can edit the starter without Manage Messages on others’ posts.

## Forum index

1. Set `FORUM_CHANNEL_ID` (sandbox: `1258321779265376266`).
2. Restart the bot — it **finds or creates** the index post (`INDEX_THREAD_TITLE`, default `Liste des évènements`), pins it, and maintains the starter message. The forum **post icon** (emoji in the list) can only be chosen in the Discord UI when creating a post; to use one, create the index manually with the icon you want, ensure the bot owns the starter (or recreate via bot and accept no icon), then set `INDEX_THREAD_ID`.
3. Optional: `INDEX_THREAD_ID` pins a specific bot-owned index thread.
4. Event threads: date is **before the first ` - `**. Multi-day titles use the **first day** for sorting (`15 & 16 mai`, `21-22 novembre`, `21/22`, `21, 22`, `31 octobre & 1 novembre`, optional leading emoji). Events more than **7 days** in the past are hidden (`PAST_EVENT_GRACE_DAYS`).
5. Set `HOME_TAG_ID` to your forum tag snowflake: index lines start with `:house:` for tagged “home” events, `:earth_africa:` otherwise.

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
