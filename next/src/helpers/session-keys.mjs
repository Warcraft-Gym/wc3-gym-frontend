// every localStorage key one session owns; a logout drops all of them
export const SESSION_KEYS = ['user', 'me', 'viewAs'];

export const clearSession = (store = localStorage) => SESSION_KEYS.forEach((key) => store.removeItem(key));
