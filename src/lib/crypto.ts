export function generateSecureString(length: number): string {
	if (length <= 0) {
		throw new Error('Length must be a positive number.');
	}

	let secureString = '';

	while (secureString.length < length) {
		// Generate a random buffer of bytes
		const array = new Uint8Array(length);
		crypto.getRandomValues(array);

		// Convert to a base64 string
		const base64String = btoa(String.fromCharCode(...array));

		// Remove non-alphanumeric characters and append
		secureString += base64String.replace(/[^a-zA-Z0-9]/g, '');
	}

	// Return the string trimmed to the exact desired length
	return secureString.substring(0, length);
}
