import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
	datePartFromThreadTitle,
	normalizeDatePart,
	parseEventDateFromTitle,
} from './parseEventDate';
import { eventStillListed } from './eventInWindow';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('datePartFromThreadTitle', () => {
	it('takes segment before first dash', () => {
		assert.equal(
			datePartFromThreadTitle(
				'🏠 15 & 16 mai 2027 - CHAMP CHICAS N3 - LE MANS',
			),
			'🏠 15 & 16 mai 2027',
		);
	});

	it('keeps classic city suffix format', () => {
		assert.equal(
			datePartFromThreadTitle('12 novembre 2026 - Toulouse'),
			'12 novembre 2026',
		);
	});
});

describe('normalizeDatePart', () => {
	it('removes emoji and multi-day ampersand same month', () => {
		assert.equal(normalizeDatePart('🏠 15 & 16 mai 2027'), '15 mai 2027');
	});

	it('cross-month ampersand keeps first day', () => {
		assert.equal(
			normalizeDatePart('31 octobre & 1 novembre 2026'),
			'31 octobre 2026',
		);
	});

	it('collapses day ranges', () => {
		assert.equal(normalizeDatePart('21-22 novembre 2026'), '21 novembre 2026');
		assert.equal(normalizeDatePart('21/22 novembre 2026'), '21 novembre 2026');
		assert.equal(normalizeDatePart('21, 22 novembre 2026'), '21 novembre 2026');
	});
});

describe('parseEventDateFromTitle', () => {
	it('parses multi-day title with emoji and extra dashes', () => {
		const d = parseEventDateFromTitle(
			'🏠 15 & 16 mai 2027 - CHAMP CHICAS N3 - LE MANS',
		);
		assert.ok(d);
		assert.equal(d!.date(), 15);
		assert.equal(d!.month(), 4);
		assert.equal(d!.year(), 2027);
	});

	it('parses French date with city suffix', () => {
		const d = parseEventDateFromTitle('12 novembre 2026 - Toulouse');
		assert.ok(d);
		assert.equal(d!.date(), 12);
		assert.equal(d!.month(), 10);
	});

	it('rejects invalid title', () => {
		assert.equal(parseEventDateFromTitle('Toulouse soon'), null);
	});

	it('parses cross-month ampersand title', () => {
		const d = parseEventDateFromTitle('31 octobre & 1 novembre 2026 - NANTES');
		assert.ok(d);
		assert.equal(d!.date(), 31);
		assert.equal(d!.month(), 9);
		assert.equal(d!.year(), 2026);
	});

	for (const title of [
		'21-22 novembre 2026 - BREST',
		'21/22 novembre 2026 - BREST',
		'21, 22 novembre 2026 - BREST',
	]) {
		it(`parses day range: ${title}`, () => {
			const d = parseEventDateFromTitle(title);
			assert.ok(d);
			assert.equal(d!.date(), 21);
			assert.equal(d!.month(), 10);
			assert.equal(d!.year(), 2026);
		});
	}
});

describe('eventStillListed', () => {
	const paris = 'Europe/Paris';

	it('excludes events older than grace window', () => {
		const now = dayjs.tz('2026-03-10', paris).startOf('day');
		const event = dayjs.tz('2026-03-01', paris).startOf('day');
		assert.equal(eventStillListed(event, 7, now), false);
	});
});
