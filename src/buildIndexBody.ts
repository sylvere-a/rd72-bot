import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/fr';

dayjs.extend(utc);
dayjs.extend(timezone);

const PARIS = 'Europe/Paris';
const DISCORD_MESSAGE_LIMIT = 2000;

export type IndexEntry = {
	threadId: string;
	title: string;
	eventDate: dayjs.Dayjs;
	isHome: boolean;
};

export function buildIndexBody(guildId: string, entries: IndexEntry[]): string {
	const sorted = [...entries].sort(
		(a, b) => a.eventDate.valueOf() - b.eventDate.valueOf(),
	);

	const updated = dayjs().tz(PARIS).locale('fr').format('D MMMM YYYY [à] HH:mm');
	const header = `_Mis à jour le ${updated}_\n\n`;

	if (sorted.length === 0) {
		return `${header}\n_Aucun event à afficher._`;
	}

	const lineFor = (entry: IndexEntry) => {
		const url = `https://discord.com/channels/${guildId}/${entry.threadId}`;
		const prefix = entry.isHome ? ':house: **' : ':minibus: ';
		const suffix = entry.isHome ? '**' : '';
		return `${prefix}[${entry.title}](${url})${suffix}`;
	};

	const allLines = sorted.map(lineFor);

	while (allLines.length > 0) {
		const body = header + allLines.join('\n');
		if (body.length <= DISCORD_MESSAGE_LIMIT) return body;
		allLines.pop();
	}

	return `${header}\n_Trop d'events pour un seul message._`;
}
