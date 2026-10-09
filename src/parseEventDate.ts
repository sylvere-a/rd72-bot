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

/** Date portion before optional " - city" suffix. */
export function datePartFromThreadTitle(title: string): string {
	const idx = title.indexOf(' - ');
	if (idx === -1) return title.trim();
	return title.slice(0, idx).trim();
}

/** Parsed event day in Europe/Paris, start of day; null if title does not match. */
export function parseEventDateFromTitle(title: string): dayjs.Dayjs | null {
	const part = datePartFromThreadTitle(title);
	const parsed = dayjs(part, TITLE_FORMAT, 'fr', true);
	if (!parsed.isValid()) return null;
	return parsed.tz(PARIS).startOf('day');
}
