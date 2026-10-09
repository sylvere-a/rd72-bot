import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { forumPostReactionEmoji } from './forumThreadEmoji';

describe('forumPostReactionEmoji', () => {
	it('maps :calendar: to Unicode', () => {
		assert.equal(forumPostReactionEmoji(':calendar:'), '📅');
	});

	it('passes through custom emoji markup', () => {
		assert.equal(
			forumPostReactionEmoji('<:rd72:123456789012345678>'),
			'<:rd72:123456789012345678>',
		);
	});
});
