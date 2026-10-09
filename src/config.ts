/** Default forum post title for the bot-owned index thread. */
export const DEFAULT_INDEX_THREAD_TITLE = 'Liste des évènements';

export type ForumConfig = {
	channelId: string;
	indexThreadId: string | null;
	indexThreadTitle: string;
	homeTagId: string | null;
	debounceMs: number;
	pastEventGraceDays: number;
};

export type AppConfig = {
	token: string;
	forum: ForumConfig | null;
};

function readPositiveInt(envKey: string, defaultValue: number): number {
	const raw = process.env[envKey];
	if (raw === undefined || raw === '') return defaultValue;
	const n = Number.parseInt(raw, 10);
	if (Number.isNaN(n) || n < 0) return defaultValue;
	return n;
}

export function loadConfig(): AppConfig {
	const token = process.env.TOKEN?.trim();
	if (!token) {
		throw new Error('Missing TOKEN in .env');
	}

	const forumChannelId = process.env.FORUM_CHANNEL_ID?.trim();
	const indexThreadId = process.env.INDEX_THREAD_ID?.trim() || null;
	const indexThreadTitle =
		process.env.INDEX_THREAD_TITLE?.trim() || DEFAULT_INDEX_THREAD_TITLE;
	const homeTagId = process.env.HOME_TAG_ID?.trim() || null;

	let forum: ForumConfig | null = null;
	if (forumChannelId) {
		forum = {
			channelId: forumChannelId,
			indexThreadId,
			indexThreadTitle,
			homeTagId,
			debounceMs: readPositiveInt('INDEX_DEBOUNCE_MS', 5000),
			pastEventGraceDays: readPositiveInt('PAST_EVENT_GRACE_DAYS', 7),
		};
	}

	return { token, forum };
}
