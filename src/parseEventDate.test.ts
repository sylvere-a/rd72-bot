import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
	datePartFromThreadTitle,
	parseEventDateFromTitle,
} from './parseEventDate';
import { eventStillListed } from './eventInWindow';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('parseEventDateFromTitle', () => {
	it('parses French date with city suffix', () => {
		const d = parseEventDateFromTitle('12 novembre 2026 - Toulouse');
		assert.ok(d);
		assert.equal(d!.date(), 12);
		assert.equal(d!.month(), 10);
		assert.equal(d!.year(), 2026);
	});

	it('parses title without city', () => {
		assert.ok(parseEventDateFromTitle('1 janvier 2027'));
	});

	it('rejects invalid title', () => {
		assert.equal(parseEventDateFromTitle('Toulouse soon'), null);
	});

	it('datePartFromThreadTitle strips city', () => {
		assert.equal(
			datePartFromThreadTitle('12 novembre 2026 - Toulouse'),
			'12 novembre 2026',
		);
	});
});

describe('eventStillListed', () => {
	const paris = 'Europe/Paris';

	it('excludes events older than grace window', () => {
		const now = dayjs.tz('2026-03-10', paris).startOf('day');
		const event = dayjs.tz('2026-03-01', paris).startOf('day');
		assert.equal(eventStillListed(event, 7, now), false);
	});

	it('includes events within grace window', () => {
		const now = dayjs.tz('2026-03-10', paris).startOf('day');
		const event = dayjs.tz('2026-03-05', paris).startOf('day');
		assert.equal(eventStillListed(event, 7, now), true);
	});
});
