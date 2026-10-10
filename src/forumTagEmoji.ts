import type { GuildForumTag, GuildForumTagEmoji } from 'discord.js';

export function renderForumTagEmoji(emoji: GuildForumTagEmoji): string | null {
	if (emoji.id) {
		const name = emoji.name?.replace(/[^a-zA-Z0-9_]/g, '_') || 'tag';
		return `<:${name}:${emoji.id}>`;
	}
	if (emoji.name) return emoji.name;
	return null;
}

/** Space-separated emojis for tags on a thread (forum tag order on the post). */
export function formatAppliedTagEmojis(
	appliedTagIds: readonly string[],
	tagById: ReadonlyMap<string, GuildForumTag>,
	options?: { excludeTagId?: string | null },
): string {
	const parts: string[] = [];
	for (const tagId of appliedTagIds) {
		if (options?.excludeTagId && tagId === options.excludeTagId) continue;
		const tag = tagById.get(tagId);
		if (!tag?.emoji) continue;
		const rendered = renderForumTagEmoji(tag.emoji);
		if (rendered) parts.push(rendered);
	}
	return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

export function forumTagById(
	availableTags: readonly GuildForumTag[],
): Map<string, GuildForumTag> {
	return new Map(availableTags.map((tag) => [tag.id, tag]));
}
