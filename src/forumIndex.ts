import {
	ChannelType,
	Client,
	type ForumChannel,
} from 'discord.js';
import type { AppConfig } from './config';
import { buildIndexBody, type IndexEntry } from './buildIndexBody';
import { eventStillListed } from './eventInWindow';
import { parseEventDateFromTitle } from './parseEventDate';

async function fetchAllActiveThreads(forum: ForumChannel) {
	const batch = await forum.threads.fetchActive();
	return [...batch.threads.values()];
}

export async function refreshForumIndex(
	client: Client,
	forumConfig: NonNullable<AppConfig['forum']>,
): Promise<void> {
	const forum = await client.channels.fetch(forumConfig.channelId);
	if (!forum || forum.type !== ChannelType.GuildForum) {
		console.error(
			`FORUM_CHANNEL_ID ${forumConfig.channelId} is not a forum channel`,
		);
		return;
	}

	const indexThread = await client.channels.fetch(forumConfig.indexThreadId);
	if (!indexThread?.isThread()) {
		console.error(
			`INDEX_THREAD_ID ${forumConfig.indexThreadId} is not a thread`,
		);
		return;
	}

	const threads = await fetchAllActiveThreads(forum);
	const entries: IndexEntry[] = [];

	for (const thread of threads) {
		if (thread.id === forumConfig.indexThreadId) continue;

		const eventDate = parseEventDateFromTitle(thread.name);
		if (!eventDate) continue;
		if (!eventStillListed(eventDate, forumConfig.pastEventGraceDays)) {
			continue;
		}

		entries.push({
			threadId: thread.id,
			title: thread.name,
			eventDate,
		});
	}

	const guildId = forum.guildId;
	if (!guildId) {
		console.error('Forum channel has no guild id');
		return;
	}

	const content = buildIndexBody(guildId, entries);
	const starter = await indexThread.fetchStarterMessage();
	if (!starter) {
		console.error('Index thread has no starter message');
		return;
	}

	await starter.edit({ content });
	console.log(`Forum index updated (${entries.length} events)`);
}
