export default class LocalStorageManager {
	static getItem(key) {
		try {
			const item = localStorage.getItem(key);
			return item ? JSON.parse(item) : null;
		} catch (error) {
			console.error(
				`Error getting item from localStorage: ${error.message}`
			);
			return null;
		}
	}

	static setItem(key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
			return true;
		} catch (error) {
			console.error(
				`Error setting item in localStorage: ${error.message}`
			);
			return false;
		}
	}

	static removeItem(key) {
		try {
			localStorage.removeItem(key);
			return true;
		} catch (error) {
			console.error(
				`Error removing item from localStorage: ${error.message}`
			);
			return false;
		}
	}

	static clear() {
		try {
			localStorage.clear();
			return true;
		} catch (error) {
			console.error(`Error clearing localStorage: ${error.message}`);
			return false;
		}
	}
}
