import type { Emoji, ThreadChannel } from 'discord.js';

/** Value suitable for `Message#react()` (Unicode or `<:name:id>`). */
export function forumPostReactionEmoji(value: string): string {
	const trimmed = value.trim();

	const shortcode = trimmed.match(/^:([a-z0-9_+]+):$/i);
	if (shortcode) {
		const unicode = SHORTCODE_TO_UNICODE[shortcode[1].toLowerCase()];
		if (unicode) return unicode;
	}

	if (/^<a?:\w+:\d+>$/.test(trimmed)) {
		return trimmed;
	}

	if (/^\d{17,20}$/.test(trimmed)) {
		return trimmed;
	}

	return trimmed;
}

const SHORTCODE_TO_UNICODE: Record<string, string> = {
	calendar: '📅',
	house: '🏠',
	earth_africa: '🌍',
};

function reactionMatchesTarget(reactionEmoji: Emoji, target: string): boolean {
	if (reactionEmoji.id) {
		return target.includes(reactionEmoji.id);
	}
	return reactionEmoji.name === target;
}

/**
 * Forum list icons come from reactions on the starter message (same as the client post picker).
 */
export async function syncForumPostReaction(
	thread: ThreadChannel,
	botId: string,
	emojiValue: string | null,
): Promise<void> {
	if (!emojiValue) return;

	const target = forumPostReactionEmoji(emojiValue);
	const starter = await thread.fetchStarterMessage().catch(() => null);
	if (!starter) {
		console.warn(
			`Index thread ${thread.id}: no starter message; cannot set post icon reaction`,
		);
		return;
	}

	for (const reaction of starter.reactions.cache.values()) {
		if (!reactionMatchesTarget(reaction.emoji, target)) continue;
		const users = reaction.users.cache.has(botId)
			? reaction.users.cache
			: await reaction.users.fetch().catch(() => null);
		if (users?.has(botId)) return;
	}

	try {
		await starter.react(target);
	} catch (err) {
		console.warn(
			`Could not add forum post icon reaction on ${thread.id}:`,
			err instanceof Error ? err.message : err,
		);
	}
}
