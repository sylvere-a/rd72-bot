import fs from 'node:fs';
import path from 'node:path';
import {
	AttachmentBuilder,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
} from 'discord.js';

export const INDEX_COVER_FILE_NAME = 'evenements-liste-complete.png';

/** Resolved from repo root (`assets/`), not `dist/`. */
export const INDEX_COVER_IMAGE_PATH = path.join(
	__dirname,
	'..',
	'assets',
	INDEX_COVER_FILE_NAME,
);

export function indexCoverAvailable(): boolean {
	return fs.existsSync(INDEX_COVER_IMAGE_PATH);
}

export function indexCoverAttachment(): AttachmentBuilder | null {
	if (!indexCoverAvailable()) {
		console.warn(`Index cover image not found: ${INDEX_COVER_IMAGE_PATH}`);
		return null;
	}
	return new AttachmentBuilder(INDEX_COVER_IMAGE_PATH, {
		name: INDEX_COVER_FILE_NAME,
	});
}

/** Components V2: gallery references `attachment://…` (file must be in `files` on send/edit). */
export function indexCoverContainer(): ContainerBuilder | null {
	if (!indexCoverAvailable()) return null;

	const gallery = new MediaGalleryBuilder().addItems(
		new MediaGalleryItemBuilder().setURL(
			`attachment://${INDEX_COVER_FILE_NAME}`,
		),
	);

	return new ContainerBuilder().addMediaGalleryComponents(gallery);
}
