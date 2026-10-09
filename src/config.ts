export type AppConfig = {
	token: string;
	forum: {
		channelId: string;
		indexThreadId: string;
		debounceMs: number;
		pastEventGraceDays: number;
	} | null;
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
	const indexThreadId = process.env.INDEX_THREAD_ID?.trim();

	let forum: AppConfig['forum'] = null;
	if (forumChannelId && indexThreadId) {
		forum = {
			channelId: forumChannelId,
			indexThreadId,
			debounceMs: readPositiveInt('INDEX_DEBOUNCE_MS', 5000),
			pastEventGraceDays: readPositiveInt('PAST_EVENT_GRACE_DAYS', 7),
		};
	}

	return { token, forum };
}
