import dotenv from 'dotenv';
import path from 'node:path';
import {
	Client,
	Events,
	GatewayIntentBits,
	type ThreadChannel,
} from 'discord.js';
import { loadConfig } from './config';
import { debounce } from './debounce';
import { refreshForumIndex } from './forumIndex';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

let config: ReturnType<typeof loadConfig>;
try {
	config = loadConfig();
} catch (err) {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

function isTrackedForumThread(thread: ThreadChannel): boolean {
	if (!config.forum) return false;
	return (
		thread.parentId === config.forum.channelId &&
		thread.id !== config.forum.indexThreadId
	);
}

let scheduleIndexRefresh: (() => void) | undefined;

if (config.forum) {
	const forumConfig = config.forum;
	const runRefresh = () => {
		refreshForumIndex(client, forumConfig).catch((err) => {
			console.error('Forum index refresh failed:', err);
		});
	};
	scheduleIndexRefresh = debounce(runRefresh, forumConfig.debounceMs);
} else {
	console.warn(
		'Forum index disabled: set FORUM_CHANNEL_ID and INDEX_THREAD_ID in .env',
	);
}

client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready as ${readyClient.user.tag}`);
	scheduleIndexRefresh?.();
});

client.on(Events.ThreadCreate, (thread) => {
	if (!thread.isThread() || !isTrackedForumThread(thread)) return;
	scheduleIndexRefresh?.();
});

client.on(Events.ThreadUpdate, (oldThread, newThread) => {
	if (!newThread.isThread() || !isTrackedForumThread(newThread)) return;
	if (oldThread.name === newThread.name) return;
	scheduleIndexRefresh?.();
});

client.on(Events.ThreadDelete, (thread) => {
	if (!config.forum) return;
	if (thread.id === config.forum.indexThreadId) return;
	if (thread.parentId && thread.parentId !== config.forum.channelId) return;
	scheduleIndexRefresh?.();
});

process.on('SIGTERM', () => {
	client.destroy();
});

client.login(config.token);
