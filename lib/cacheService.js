export const cacheService = {
    write(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
            return true;
        } catch {
            return false;
        }
    },

    read(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed?.data ?? null;
        } catch {
            return null;
        }
    },

    clear(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    },
};