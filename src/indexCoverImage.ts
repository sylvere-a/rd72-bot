import fs from 'node:fs';
import path from 'node:path';
import { AttachmentBuilder } from 'discord.js';

export const INDEX_COVER_FILE_NAME = 'evenements-liste-complete.png';

/** Resolved from repo root (`assets/`), not `dist/`. */
export const INDEX_COVER_IMAGE_PATH = path.join(
	__dirname,
	'..',
	'assets',
	INDEX_COVER_FILE_NAME,
);

export function indexCoverAttachment(): AttachmentBuilder | null {
	if (!fs.existsSync(INDEX_COVER_IMAGE_PATH)) {
		console.warn(`Index cover image not found: ${INDEX_COVER_IMAGE_PATH}`);
		return null;
	}
	return new AttachmentBuilder(INDEX_COVER_IMAGE_PATH, {
		name: INDEX_COVER_FILE_NAME,
	});
}
