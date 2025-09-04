class StorageHelper {
    static setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Storage write error:', error);
        }
    }

    static getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage read error:', error);
            return defaultValue;
        }
    }

    static removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Storage removal error:', error);
        }
    }

    static clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Storage clear error:', error);
        }
    }

    static createPersistentState(key, initialState) {
        const savedState = this.getItem(key);
        return savedState || initialState;
    }

    static updatePersistentState(key, updateFunction) {
        const currentState = this.getItem(key);
        const newState = updateFunction(currentState);
        this.setItem(key, newState);
        return newState;
    }
}

export default StorageHelper;
