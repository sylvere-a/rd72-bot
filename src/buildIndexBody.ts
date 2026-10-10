import type { APIEmbed } from 'discord.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/fr';

dayjs.extend(utc);
dayjs.extend(timezone);

const PARIS = 'Europe/Paris';
/** Same accent as RD72 index mockups (decimal embed color). */
const INDEX_EMBED_COLOR = 2_829_617;
const VISIBLE_MONTHS = 6;
const LATER_BUCKET = 'plus-tard';
const LATER_TITLE = 'Plus tard';
const MAX_EMBEDS = 10;
const MAX_EMBED_DESCRIPTION = 4096;
const MAX_EMBED_CHARS_TOTAL = 6000;

export type IndexEntry = {
	threadId: string;
	title: string;
	eventDate: dayjs.Dayjs;
	isHome: boolean;
};

export type IndexMessagePayload = {
	content: string;
	embeds: APIEmbed[];
};

export type BuildIndexBodyOptions = {
	/** For tests; defaults to now in Europe/Paris. */
	referenceDate?: dayjs.Dayjs;
};

function lineFor(guildId: string, entry: IndexEntry): string {
	const url = `https://discord.com/channels/${guildId}/${entry.threadId}`;
	const prefix = entry.isHome ? ':house: **' : ':blue_car: ';
	const suffix = entry.isHome ? '**' : '';
	return `${prefix}[${entry.title}](${url})${suffix}`;
}

function monthGroupKey(date: dayjs.Dayjs): string {
	return date.format('YYYY-MM');
}

function monthEmbedTitle(date: dayjs.Dayjs): string {
	const label = date.tz(PARIS).locale('fr').format('MMMM YYYY');
	return label.charAt(0).toUpperCase() + label.slice(1);
}

function eventCountFooter(count: number): string {
	return count === 1 ? '1 évènement' : `${count} évènements`;
}

function embedFromEntries(
	guildId: string,
	title: string,
	entries: IndexEntry[],
): APIEmbed {
	const lines = entries.map((e) => lineFor(guildId, e));
	return {
		title,
		description: lines.join('\n'),
		color: INDEX_EMBED_COLOR,
		footer: { text: eventCountFooter(entries.length) },
	};
}

function partitionEntries(
	entries: IndexEntry[],
	referenceDate: dayjs.Dayjs,
): Map<string, IndexEntry[]> {
	const sorted = [...entries].sort(
		(a, b) => a.eventDate.valueOf() - b.eventDate.valueOf(),
	);

	const windowStart = referenceDate.tz(PARIS).startOf('month');
	const windowEndExclusive = windowStart.add(VISIBLE_MONTHS, 'month');
	const currentMonthKey = monthGroupKey(windowStart);

	const buckets = new Map<string, IndexEntry[]>();

	for (const entry of sorted) {
		const monthStart = entry.eventDate.tz(PARIS).startOf('month');
		let key: string;

		if (
			monthStart.isSame(windowEndExclusive) ||
			monthStart.isAfter(windowEndExclusive)
		) {
			key = LATER_BUCKET;
		} else if (monthStart.isBefore(windowStart)) {
			key = currentMonthKey;
		} else {
			key = monthGroupKey(entry.eventDate);
		}

		if (!buckets.has(key)) buckets.set(key, []);
		buckets.get(key)!.push(entry);
	}

	return buckets;
}

function buildEmbedsForEntries(
	guildId: string,
	entries: IndexEntry[],
	referenceDate: dayjs.Dayjs,
): APIEmbed[] | null {
	const buckets = partitionEntries(entries, referenceDate);
	const windowStart = referenceDate.tz(PARIS).startOf('month');

	const embedOrder: string[] = [];
	for (let i = 0; i < VISIBLE_MONTHS; i += 1) {
		const key = monthGroupKey(windowStart.add(i, 'month'));
		if (buckets.has(key)) embedOrder.push(key);
	}
	if (buckets.has(LATER_BUCKET)) embedOrder.push(LATER_BUCKET);

	if (embedOrder.length > MAX_EMBEDS) return null;

	const embeds: APIEmbed[] = [];
	let totalDescriptionChars = 0;

	for (const key of embedOrder) {
		const bucketEntries = buckets.get(key)!;
		const title =
			key === LATER_BUCKET
				? LATER_TITLE
				: monthEmbedTitle(bucketEntries[0].eventDate);

		const embed = embedFromEntries(guildId, title, bucketEntries);
		const description = embed.description ?? '';

		if (description.length > MAX_EMBED_DESCRIPTION) return null;

		totalDescriptionChars += description.length;
		if (totalDescriptionChars > MAX_EMBED_CHARS_TOTAL) return null;

		embeds.push(embed);
	}

	return embeds;
}

export function buildIndexBody(
	guildId: string,
	entries: IndexEntry[],
	options?: BuildIndexBodyOptions,
): IndexMessagePayload {
	const referenceDate =
		options?.referenceDate?.tz(PARIS) ?? dayjs().tz(PARIS);
	const updated = referenceDate.locale('fr').format('D MMMM YYYY [à] HH:mm');
	let header = `_Mis à jour le ${updated}_`;

	if (entries.length === 0) {
		return {
			content: `${header}\n\n_Aucun event à afficher._`,
			embeds: [],
		};
	}

	let working = [...entries];
	while (working.length > 0) {
		const embeds = buildEmbedsForEntries(guildId, working, referenceDate);
		if (embeds) {
			if (working.length < entries.length) {
				header += `\n_Liste tronquée (${working.length}/${entries.length} évènements)._`;
			}
			return { content: header, embeds };
		}
		working = working.slice(0, -1);
	}

	return {
		content: `${header}\n\n_Trop d'events pour un seul message._`,
		embeds: [],
	};
}
