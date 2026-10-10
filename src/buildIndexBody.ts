import {
	ContainerBuilder,
	MessageFlags,
	TextDisplayBuilder,
} from 'discord.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/fr';

dayjs.extend(utc);
dayjs.extend(timezone);

const PARIS = 'Europe/Paris';
const VISIBLE_MONTHS = 6;
const LATER_BUCKET = 'plus-tard';
const LATER_TITLE = 'Plus tard';
const MAX_SECTIONS = 40;
/** Text Display (type 10) content limit. */
const MAX_TEXT_DISPLAY_CHARS = 4000;

export type IndexEntry = {
	threadId: string;
	title: string;
	eventDate: dayjs.Dayjs;
	isHome: boolean;
};

export type IndexMessagePayload = {
	flags: typeof MessageFlags.IsComponentsV2;
	components: ContainerBuilder[];
};

export type BuildIndexBodyOptions = {
	/** For tests; defaults to now in Europe/Paris. */
	referenceDate?: dayjs.Dayjs;
};

function lineFor(guildId: string, entry: IndexEntry): string {
	const url = `https://discord.com/channels/${guildId}/${entry.threadId}`;
	if (entry.isHome) {
		return `> :house: [**${entry.title}**](${url})`;
	}
	return `> :blue_car: [${entry.title}](${url})`;
}

function monthGroupKey(date: dayjs.Dayjs): string {
	return date.format('YYYY-MM');
}

function sectionTitle(key: string, firstEntry: IndexEntry): string {
	if (key === LATER_BUCKET) return LATER_TITLE;
	const label = firstEntry.eventDate
		.tz(PARIS)
		.locale('fr')
		.format('MMMM YYYY');
	return label.charAt(0).toUpperCase() + label.slice(1);
}

function eventCountLabel(count: number): string {
	return count === 1 ? '1 évènement' : `${count} évènements`;
}

function sectionText(
	guildId: string,
	title: string,
	entries: IndexEntry[],
): string {
	const lines = entries.map((e) => lineFor(guildId, e)).join('\n\n');
	return `# ${title}\n\n${lines}\n\n*${eventCountLabel(entries.length)}*`;
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

function buildComponentsForEntries(
	guildId: string,
	entries: IndexEntry[],
	referenceDate: dayjs.Dayjs,
	header: string,
): ContainerBuilder[] | null {
	const buckets = partitionEntries(entries, referenceDate);
	const windowStart = referenceDate.tz(PARIS).startOf('month');

	const sectionOrder: string[] = [];
	for (let i = 0; i < VISIBLE_MONTHS; i += 1) {
		const key = monthGroupKey(windowStart.add(i, 'month'));
		if (buckets.has(key)) sectionOrder.push(key);
	}
	if (buckets.has(LATER_BUCKET)) sectionOrder.push(LATER_BUCKET);

	if (sectionOrder.length + 1 > MAX_SECTIONS) return null;

	const components: ContainerBuilder[] = [
		new ContainerBuilder().addTextDisplayComponents(
			new TextDisplayBuilder().setContent(header),
		),
	];

	for (const key of sectionOrder) {
		const bucketEntries = buckets.get(key)!;
		const title = sectionTitle(key, bucketEntries[0]);
		const text = sectionText(guildId, title, bucketEntries);
		if (text.length > MAX_TEXT_DISPLAY_CHARS) return null;

		components.push(
			new ContainerBuilder().addTextDisplayComponents(
				new TextDisplayBuilder().setContent(text),
			),
		);
	}

	return components;
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
			flags: MessageFlags.IsComponentsV2,
			components: [
				new ContainerBuilder().addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`${header}\n\n_Aucun event à afficher._`,
					),
				),
			],
		};
	}

	let working = [...entries];
	while (working.length > 0) {
		let messageHeader = header;
		if (working.length < entries.length) {
			messageHeader += `\n_Liste tronquée (${working.length}/${entries.length} évènements)._`;
		}
		const components = buildComponentsForEntries(
			guildId,
			working,
			referenceDate,
			messageHeader,
		);
		if (components) {
			return { flags: MessageFlags.IsComponentsV2, components };
		}
		working = working.slice(0, -1);
	}

	return {
		flags: MessageFlags.IsComponentsV2,
		components: [
			new ContainerBuilder().addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`${header}\n\n_Trop d'events pour un seul message._`,
				),
			),
		],
	};
}
