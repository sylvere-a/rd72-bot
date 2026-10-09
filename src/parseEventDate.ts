import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/fr';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const PARIS = 'Europe/Paris';
const TITLE_FORMAT = 'D MMMM YYYY';
const MONTH_CHARS = 'a-zA-Zàâäéèêëïîôùûüç';

/**
 * Text before the first " - " (event label / venue may follow).
 */
export function datePartFromThreadTitle(title: string): string {
	const idx = title.indexOf(' - ');
	if (idx === -1) return title.trim();
	return title.slice(0, idx).trim();
}

/**
 * Reduce multi-day / noisy prefixes to "D MMMM YYYY" for sorting (first day wins).
 */
export function normalizeDatePart(raw: string): string {
	let s = raw.replace(/\s+/g, ' ').trim();
	s = s.replace(/^[^\d]*/, '');

	const yearMatch = s.match(/(20\d{2})\s*$/);
	const year = yearMatch?.[1] ?? null;
	let body = year ? s.replace(/\s*20\d{2}\s*$/, '').trim() : s;

	// 21-22 / 21/22 / 21, 22 novembre …
	body = body.replace(
		new RegExp(`^(\\d{1,2})\\s*[-/,]\\s*\\d{1,2}(\\s+(?:[${MONTH_CHARS}]))`),
		'$1$2',
	);

	// 15 & 16 mai (same month)
	const sameMonth = body.match(
		new RegExp(`^(\\d{1,2})\\s*&\\s*\\d{1,2}\\s+([${MONTH_CHARS}][${MONTH_CHARS}\\s]*)$`),
	);
	if (sameMonth) {
		body = `${sameMonth[1]} ${sameMonth[2].trim()}`;
	} else if (body.includes('&')) {
		// 31 octobre & 1 novembre → 31 octobre (+ year)
		body = body.split('&')[0].trim();
	}

	body = body.replace(/\s+/g, ' ').trim();
	if (year && !/20\d{2}/.test(body)) {
		body = `${body} ${year}`;
	}
	return body;
}

function tryParseDatePart(part: string): dayjs.Dayjs | null {
	const normalized = normalizeDatePart(part);
	const attempts = [normalized, normalized.toLowerCase()];
	for (const candidate of attempts) {
		const parsed = dayjs(candidate, TITLE_FORMAT, 'fr', true);
		if (parsed.isValid()) return parsed;
	}
	return null;
}

/** Parsed event day in Europe/Paris, start of day; null if title does not match. */
export function parseEventDateFromTitle(title: string): dayjs.Dayjs | null {
	const parsed = tryParseDatePart(datePartFromThreadTitle(title));
	if (!parsed) return null;
	return dayjs.tz(parsed.format('YYYY-MM-DD'), PARIS).startOf('day');
}
