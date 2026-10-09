import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const PARIS = 'Europe/Paris';

export function eventStillListed(
	eventDate: dayjs.Dayjs,
	pastEventGraceDays: number,
	now: dayjs.Dayjs = dayjs.tz(PARIS),
): boolean {
	const today = now.startOf('day');
	const cutoff = today.subtract(pastEventGraceDays, 'day');
	return eventDate.isSame(cutoff, 'day') || eventDate.isAfter(cutoff, 'day');
}
