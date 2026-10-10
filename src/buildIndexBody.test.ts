import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ContainerBuilder, MessageFlags } from 'discord.js';
import { buildIndexBody } from './buildIndexBody';

dayjs.extend(utc);
dayjs.extend(timezone);

const ref = dayjs.tz('2026-10-15', 'Europe/Paris');

function textFromContainer(container: ContainerBuilder): string {
	const json = container.toJSON();
	const first = json.components?.[0];
	return first && 'content' in first ? String(first.content) : '';
}

describe('buildIndexBody', () => {
	it('builds Components V2 containers per month', () => {
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

		assert.equal(payload.flags, MessageFlags.IsComponentsV2);
		assert.equal(payload.components.length, 3);
		assert.match(textFromContainer(payload.components[0]), /Mis à jour le/);
		assert.match(textFromContainer(payload.components[1]), /# Octobre 2026/);
		assert.match(textFromContainer(payload.components[1]), /LE MANS/);
		assert.match(textFromContainer(payload.components[1]), /\*2 évènements\*/);
		assert.match(textFromContainer(payload.components[2]), /# Novembre 2026/);
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

		assert.equal(payload.components.length, 3);
		assert.match(textFromContainer(payload.components[2]), /# Plus tard/);
		assert.match(textFromContainer(payload.components[2]), /PARIS/);
	});
});
