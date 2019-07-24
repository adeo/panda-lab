class StorageUtils {
    setItemInStorage(key, item) {
        localStorage.setItem(key, JSON.stringify(item));
    }

    getItemFromStorage(key) {
        return JSON.parse(localStorage.getItem(key));
    }

    removeFromStorage(key) {
        localStorage.removeItem(key);
    }
}

export const storageUtils = new StorageUtils();


