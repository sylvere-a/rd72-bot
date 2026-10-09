/** Discord forum post icon (not part of the thread title). */
export type ForumThreadEmojiPayload = {
	emoji_id: string | null;
	emoji_name: string | null;
};

const SHORTCODE_TO_UNICODE: Record<string, string> = {
	calendar: '📅',
	house: '🏠',
	earth_africa: '🌍',
};

/**
 * Parse INDEX_THREAD_EMOJI for POST/PATCH forum thread:
 * - Unicode: 📅
 * - Custom: <:name:123> or snowflake id
 * - Shortcodes: :calendar: → 📅 (convenience only)
 */
export function parseForumThreadEmoji(value: string): ForumThreadEmojiPayload {
	const trimmed = value.trim();

	const shortcode = trimmed.match(/^:([a-z0-9_+]+):$/i);
	if (shortcode) {
		const unicode = SHORTCODE_TO_UNICODE[shortcode[1].toLowerCase()];
		if (unicode) {
			return { emoji_id: null, emoji_name: unicode };
		}
	}

	const custom = trimmed.match(/^<a?:\w+:(\d+)>$/);
	if (custom) {
		return { emoji_id: custom[1], emoji_name: null };
	}

	if (/^\d{17,20}$/.test(trimmed)) {
		return { emoji_id: trimmed, emoji_name: null };
	}

	return { emoji_id: null, emoji_name: trimmed };
}
