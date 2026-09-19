const KEY = 'returnUrl';  // sessionStorage survives the Discord OAuth round trip in the same tab

// a path inside this app: one leading slash, no "//", no backslash, no whitespace
export const isSafePath = (path) => typeof path === 'string' && /^\/(?!\/)[^\\\s]*$/.test(path);

export const saveReturnUrl = (path, store = sessionStorage) => {
    if (isSafePath(path)) store.setItem(KEY, path);
};

// read once: the saved path, or the fallback when none is saved or it is unsafe
export const takeReturnUrl = (fallback, store = sessionStorage) => {
    const path = store.getItem(KEY);
    store.removeItem(KEY);
    return isSafePath(path) ? path : fallback;
};
