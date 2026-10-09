import {
	ChannelType,
	Client,
	DiscordAPIError,
	type ForumChannel,
	type ThreadChannel,
} from 'discord.js';
import { indexThreadDisplayName, type ForumConfig } from './config';
import { buildIndexBody, type IndexEntry } from './buildIndexBody';
import { eventStillListed } from './eventInWindow';
import { parseEventDateFromTitle } from './parseEventDate';

export type ForumRuntime = {
	indexThreadId: string;
};

async function fetchAllActiveThreads(forum: ForumChannel) {
	const batch = await forum.threads.fetchActive();
	return [...batch.threads.values()];
}

async function starterIsFromBot(
	thread: ThreadChannel,
	botId: string,
): Promise<boolean> {
	const starter = await thread.fetchStarterMessage().catch(() => null);
	return starter?.author.id === botId;
}

async function findBotIndexThread(
	threads: ThreadChannel[],
	title: string,
	botId: string,
): Promise<ThreadChannel | null> {
	for (const thread of threads) {
		if (!thread.isThread() || thread.name !== title) continue;
		if (await starterIsFromBot(thread, botId)) return thread;
	}
	return null;
}

async function resolveIndexThread(
	client: Client,
	forum: ForumChannel,
	forumConfig: ForumConfig,
): Promise<ThreadChannel> {
	const botId = client.user?.id;
	if (!botId) {
		throw new Error('Client is not logged in');
	}

	if (forumConfig.indexThreadId) {
		const existing = await client.channels.fetch(forumConfig.indexThreadId);
		if (existing?.isThread()) {
			if (await starterIsFromBot(existing, botId)) {
				return existing;
			}
			console.warn(
				`INDEX_THREAD_ID ${forumConfig.indexThreadId} is not bot-owned; ignoring env and find/create by title.`,
			);
		} else {
			console.warn(
				`INDEX_THREAD_ID ${forumConfig.indexThreadId} invalid; find/create by title.`,
			);
		}
	}

	const active = await fetchAllActiveThreads(forum);
	const indexName = indexThreadDisplayName(forumConfig);
	const found = await findBotIndexThread(
		active as ThreadChannel[],
		indexName,
		botId,
	);
	if (found) return found;

	console.log(`Creating forum index thread "${indexName}" …`);
	const created = await forum.threads.create({
		name: indexName,
		message: {
			content: '_Initialisation de l’index…_',
		},
		reason: 'RD72 bot events index',
	});

	await created.pin('RD72 bot events index');
	console.log(
		`Created index thread ${created.id}. Optional: set INDEX_THREAD_ID=${created.id} in .env`,
	);
	return created;
}

export async function refreshForumIndex(
	client: Client,
	forumConfig: ForumConfig,
	runtime: ForumRuntime,
): Promise<void> {
	const forum = await client.channels.fetch(forumConfig.channelId);
	if (!forum || forum.type !== ChannelType.GuildForum) {
		console.error(
			`FORUM_CHANNEL_ID ${forumConfig.channelId} is not a forum channel`,
		);
		return;
	}

	const indexThread = await resolveIndexThread(client, forum, forumConfig);
	runtime.indexThreadId = indexThread.id;

	const threads = await fetchAllActiveThreads(forum);
	const entries: IndexEntry[] = [];
	let skippedUnparsed = 0;
	let skippedPast = 0;

	for (const thread of threads) {
		if (thread.id === runtime.indexThreadId) continue;
		if (thread.name === indexThreadDisplayName(forumConfig)) continue;

		const eventDate = parseEventDateFromTitle(thread.name);
		if (!eventDate) {
			skippedUnparsed += 1;
			continue;
		}
		if (!eventStillListed(eventDate, forumConfig.pastEventGraceDays)) {
			skippedPast += 1;
			continue;
		}

		const isHome =
			forumConfig.homeTagId !== null &&
			thread.appliedTags.includes(forumConfig.homeTagId);

		entries.push({
			threadId: thread.id,
			title: thread.name,
			eventDate,
			isHome,
		});
	}

	if (entries.length === 0 && threads.length > 1) {
		const sample = threads
			.filter(
				(t) =>
					t.id !== runtime.indexThreadId &&
					t.name !== indexThreadDisplayName(forumConfig),
			)
			.slice(0, 5)
			.map((t) => `"${t.name}"`)
			.join(', ');
		console.log(
			`Forum index: 0 events listed (${threads.length} active threads; unparsed: ${skippedUnparsed}, outside ${forumConfig.pastEventGraceDays}d window: ${skippedPast}). Titles: ${sample || 'none'}`,
		);
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

	try {
		await starter.edit({ content });
		console.log(`Forum index updated (${entries.length} events)`);
	} catch (err) {
		if (err instanceof DiscordAPIError) {
			console.error(
				`Forum index edit failed: [${err.code}] ${err.message}`,
			);
		}
		throw err;
	}
}
