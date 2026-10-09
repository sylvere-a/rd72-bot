import dotenv from 'dotenv';
import path from 'node:path';
import {
	Client,
	DiscordAPIError,
	Events,
	GatewayIntentBits,
	type ThreadChannel,
} from 'discord.js';
import { indexThreadDisplayName, loadConfig } from './config';
import { debounce } from './debounce';
import { refreshForumIndex, type ForumRuntime } from './forumIndex';

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

const forumRuntime: ForumRuntime = { indexThreadId: '' };

function isTrackedForumThread(thread: ThreadChannel): boolean {
	if (!config.forum) return false;
	if (thread.parentId !== config.forum.channelId) return false;
	if (forumRuntime.indexThreadId && thread.id === forumRuntime.indexThreadId) {
		return false;
	}
	if (thread.name === indexThreadDisplayName(config.forum)) return false;
	return true;
}

let scheduleIndexRefresh: (() => void) | undefined;

if (config.forum) {
	const forumConfig = config.forum;
	const runRefresh = () => {
		refreshForumIndex(client, forumConfig, forumRuntime).catch((err) => {
			if (err instanceof DiscordAPIError) {
				console.error(
					`Forum index refresh failed: [${err.code}] ${err.message}`,
				);
				return;
			}
			console.error('Forum index refresh failed:', err);
		});
	};
	scheduleIndexRefresh = debounce(runRefresh, forumConfig.debounceMs);
} else {
	console.warn('Forum index disabled: set FORUM_CHANNEL_ID in .env');
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
	const tagsUnchanged =
		oldThread.appliedTags.length === newThread.appliedTags.length &&
		oldThread.appliedTags.every((id) => newThread.appliedTags.includes(id));
	if (oldThread.name === newThread.name && tagsUnchanged) return;
	scheduleIndexRefresh?.();
});

client.on(Events.ThreadDelete, (thread) => {
	if (!config.forum) return;
	if (forumRuntime.indexThreadId && thread.id === forumRuntime.indexThreadId) {
		forumRuntime.indexThreadId = '';
	}
	if (thread.parentId && thread.parentId !== config.forum.channelId) return;
	scheduleIndexRefresh?.();
});

process.on('SIGTERM', () => {
	client.destroy();
});

client.login(config.token);
