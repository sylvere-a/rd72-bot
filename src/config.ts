/** Default forum post title for the bot-owned index thread (without emoji prefix). */
export const DEFAULT_INDEX_THREAD_TITLE = 'Liste des évènements';
export const DEFAULT_INDEX_THREAD_EMOJI = ':calendar:';

export type ForumConfig = {
	channelId: string;
	/** If set, use this thread when valid; otherwise find/create by index thread name. */
	indexThreadId: string | null;
	indexThreadTitle: string;
	/** Prepended to indexThreadTitle for the forum post name (e.g. :calendar: or 📅). */
	indexThreadEmoji: string | null;
	/** Forum tag id: events with this tag show :house: in the index, others :earth_africa: */
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
	const indexThreadEmoji = ((): string | null => {
		if (process.env.INDEX_THREAD_EMOJI === undefined) {
			return DEFAULT_INDEX_THREAD_EMOJI;
		}
		const trimmed = process.env.INDEX_THREAD_EMOJI.trim();
		return trimmed === '' ? null : trimmed;
	})();
	const homeTagId = process.env.HOME_TAG_ID?.trim() || null;

	let forum: ForumConfig | null = null;
	if (forumChannelId) {
		forum = {
			channelId: forumChannelId,
			indexThreadId,
			indexThreadTitle,
			indexThreadEmoji,
			homeTagId,
			debounceMs: readPositiveInt('INDEX_DEBOUNCE_MS', 5000),
			pastEventGraceDays: readPositiveInt('PAST_EVENT_GRACE_DAYS', 7),
		};
	}

	return { token, forum };
}

/** Full forum post title for the index thread (emoji + title). */
export function indexThreadDisplayName(forum: ForumConfig): string {
	if (!forum.indexThreadEmoji) return forum.indexThreadTitle;
	return `${forum.indexThreadEmoji} ${forum.indexThreadTitle}`;
}
