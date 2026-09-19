// every localStorage key one session owns; a logout and a Clerk key change drop all of them
export const SESSION_KEYS = ['user', 'me', 'viewAs'];

export const clearSession = (store = localStorage) => SESSION_KEYS.forEach((key) => store.removeItem(key));
