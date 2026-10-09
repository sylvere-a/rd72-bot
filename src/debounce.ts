export function debounce<T extends (...args: never[]) => void>(
	fn: T,
	waitMs: number,
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | undefined;

	return (...args: Parameters<T>) => {
		if (timeout !== undefined) clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), waitMs);
	};
}
