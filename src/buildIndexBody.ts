import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const PARIS = 'Europe/Paris';
const DISCORD_MESSAGE_LIMIT = 2000;

export type IndexEntry = {
	threadId: string;
	title: string;
	eventDate: dayjs.Dayjs;
};

export function buildIndexBody(guildId: string, entries: IndexEntry[]): string {
	const sorted = [...entries].sort(
		(a, b) => a.eventDate.valueOf() - b.eventDate.valueOf(),
	);

	const updated = dayjs.tz(PARIS).format('D MMMM YYYY [à] HH:mm');
	const header = `**Calendrier des events**\n_Mis à jour le ${updated}_\n`;

	if (sorted.length === 0) {
		return `${header}\n_Aucun event à afficher._`;
	}

	const lineFor = (entry: IndexEntry) => {
		const url = `https://discord.com/channels/${guildId}/${entry.threadId}`;
		return `• [${entry.title}](${url})`;
	};

	const allLines = sorted.map(lineFor);
	let omitted = 0;

	const footerFor = (shown: number, hidden: number) => {
		const countLine = `\n_${shown} event(s) listé(s)._`;
		const hiddenLine =
			hidden > 0 ? `\n_… et ${hidden} autre(s)._` : '';
		return countLine + hiddenLine;
	};

	while (allLines.length > 0) {
		const hidden = omitted;
		const body = header + allLines.join('\n') + footerFor(allLines.length, hidden);
		if (body.length <= DISCORD_MESSAGE_LIMIT) return body;
		allLines.pop();
		omitted += 1;
	}

	return `${header}\n_Trop d'events pour un seul message._`;
}
