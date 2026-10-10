import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { buildIndexBody } from './buildIndexBody';

dayjs.extend(utc);
dayjs.extend(timezone);

const ref = dayjs.tz('2026-10-15', 'Europe/Paris');

describe('buildIndexBody', () => {
	it('groups events by month in embeds', () => {
		const guildId = '945313674959134730';
		const payload = buildIndexBody(
			guildId,
			[
				{
					threadId: '1',
					title: '24 octobre 2026 - LE MANS',
					eventDate: dayjs.tz('2026-10-24', 'Europe/Paris'),
					isHome: true,
				},
				{
					threadId: '2',
					title: '28 octobre 2026 - NANTES',
					eventDate: dayjs.tz('2026-10-28', 'Europe/Paris'),
					isHome: false,
				},
				{
					threadId: '3',
					title: '12 novembre 2026 - TOULOUSE',
					eventDate: dayjs.tz('2026-11-12', 'Europe/Paris'),
					isHome: false,
				},
			],
			{ referenceDate: ref },
		);

		assert.match(payload.content, /Mis à jour le/);
		assert.equal(payload.embeds.length, 2);
		assert.match(payload.embeds[0].title ?? '', /Octobre 2026/i);
		assert.match(payload.embeds[0].description ?? '', /LE MANS/);
		assert.match(payload.embeds[0].description ?? '', /:house:/);
		assert.equal(payload.embeds[0].footer?.text, '2 évènements');
		assert.match(payload.embeds[1].title ?? '', /Novembre 2026/i);
		assert.equal(payload.embeds[1].footer?.text, '1 évènement');
	});

	it('puts events beyond the next 6 months in Plus tard', () => {
		const guildId = '945313674959134730';
		const payload = buildIndexBody(
			guildId,
			[
				{
					threadId: '1',
					title: '24 octobre 2026 - LE MANS',
					eventDate: dayjs.tz('2026-10-24', 'Europe/Paris'),
					isHome: false,
				},
				{
					threadId: '2',
					title: '15 mai 2027 - PARIS',
					eventDate: dayjs.tz('2027-05-15', 'Europe/Paris'),
					isHome: false,
				},
			],
			{ referenceDate: ref },
		);

		assert.equal(payload.embeds.length, 2);
		assert.match(payload.embeds[0].title ?? '', /Octobre 2026/i);
		assert.equal(payload.embeds[1].title, 'Plus tard');
		assert.match(payload.embeds[1].description ?? '', /PARIS/);
	});
});
