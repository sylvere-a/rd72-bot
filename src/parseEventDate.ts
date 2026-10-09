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

/**
 * Text before the first " - " (event label / venue may follow).
 * Example: "🏠 15 & 16 mai 2027 - CHAMP … - LE MANS" → "🏠 15 & 16 mai 2027"
 */
export function datePartFromThreadTitle(title: string): string {
	const idx = title.indexOf(' - ');
	if (idx === -1) return title.trim();
	return title.slice(0, idx).trim();
}

/** Strip leading emoji/junk; collapse "15 & 16 mai 2027" to "15 mai 2027" for sorting. */
export function normalizeDatePart(raw: string): string {
	let s = raw.replace(/\s+/g, ' ').trim();
	s = s.replace(/^[^\d]*/, '');
	s = s.replace(/^(\d{1,2})\s*&\s*\d{1,2}(\s+)/, '$1$2');
	return s.trim();
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
