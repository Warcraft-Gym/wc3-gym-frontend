import { ref } from 'vue';

const media = window.matchMedia('(prefers-color-scheme: dark)');
const prefersDark = ref(media.matches);
media.addEventListener('change', (e) => { prefersDark.value = e.matches; });

// A read-only page is embedded in the light warcraft-gym.com page, so it stays light.
const readonly = new URLSearchParams(location.search).get('readonly');
const embedded = readonly === '1' || readonly === 'true';

// light, dark, or system. system follows the operating system setting.
export const themeMode = ref(localStorage.getItem('theme') || 'system');

export function setThemeMode(mode) {
    themeMode.value = mode;
    localStorage.setItem('theme', mode);
}

export function activeTheme() {
    if (embedded) return 'light';
    if (themeMode.value !== 'system') return themeMode.value;
    return prefersDark.value ? 'dark' : 'light';
}
