import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	formatAppliedTagEmojis,
	forumTagById,
	renderForumTagEmoji,
} from './forumTagEmoji';

describe('forumTagEmoji', () => {
	it('renders unicode and custom tag emojis', () => {
		assert.equal(renderForumTagEmoji({ id: null, name: '🎉' }), '🎉');
		assert.equal(
			renderForumTagEmoji({ id: '123', name: 'rd72' }),
			'<:rd72:123>',
		);
	});

	it('appends tag emojis in applied order', () => {
		const map = forumTagById([
			{
				id: '1',
				name: 'A',
				moderated: false,
				emoji: { id: null, name: '🏠' },
			},
			{
				id: '2',
				name: 'B',
				moderated: false,
				emoji: { id: '99', name: 'car' },
			},
		]);
		assert.equal(
			formatAppliedTagEmojis(['2', '1'], map),
			' <:car:99> 🏠',
		);
	});

	it('skips home tag when excluded', () => {
		const map = forumTagById([
			{
				id: 'home',
				name: 'Home',
				moderated: false,
				emoji: { id: null, name: '🏠' },
			},
			{
				id: '2',
				name: 'B',
				moderated: false,
				emoji: { id: '99', name: 'car' },
			},
		]);
		assert.equal(
			formatAppliedTagEmojis(['home', '2'], map, { excludeTagId: 'home' }),
			' <:car:99>',
		);
	});
});
