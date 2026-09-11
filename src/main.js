import { createApp } from 'vue';

import '@mdi/font/css/materialdesignicons.css'
import '@fontsource/alegreya/700.css'
import '@fontsource/alegreya/800.css'
import '@fontsource/alegreya-sans/400.css'
import '@fontsource/alegreya-sans/500.css'
import '@fontsource/alegreya-sans/700.css'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { discordMark } from '@/assets/discordMark'

//Countries API
import 'flagpack/dist/flagpack.css'

//Pinia
import { createPinia } from 'pinia';

//Clerk
import { clerkPlugin } from '@clerk/vue';

const pinia = createPinia();

//Vuetify
import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createVuetify } from 'vuetify';
import { activeTheme } from '@/helpers/theme';


//Components
import RaceIcon from '@/components/RaceIcon.vue'
import RaceSelect from '@/components/RaceSelect.vue'
import FlagIcon from '@/components/FlagIcon.vue'
import CountrySelect from '@/components/CountrySelect.vue'
import PlayerName from '@/components/PlayerName.vue'

const vuetify = new createVuetify ({
    theme: {
        defaultTheme: activeTheme(),  // the stored choice, so the first paint is already right
        themes: {
            light: {
                dark: false,
                colors: {
                    background: '#E8E9E3',
                    surface: '#F4F5F1',
                    'surface-bright': '#FAFBF8',
                    'surface-light': '#E1E4DD',
                    'surface-variant': '#1C2420',
                    'on-surface-variant': '#F2F4ED',
                    'on-background': '#1A241E',
                    'on-surface': '#1A241E',
                    primary: '#9A5B18',
                    'primary-darken-1': '#7C4912',
                    'on-primary': '#FBF7F1',
                    secondary: '#3F4C43',
                    'secondary-darken-1': '#2E3931',
                    'on-secondary': '#F2F4ED',
                    error: '#8C3B2A',
                    warning: '#A65200',
                    info: '#2F6690',
                    success: '#3D7A4A',
                    'primary-text': '#7C4912',
                    band: '#1C2420',
                    'on-band': '#F2F4ED',
                    hero: '#1C2420',
                    'on-hero': '#F2F4ED',
                    'band-muted': '#B9C4B6',
                    tag: '#DCE1D8',
                    'on-tag': '#3F4C43',
                    win: '#1F63A6',
                    loss: '#B8432C',
                    draw: '#5F6B61',
                    'tier-1': '#4E9A2E',
                    'tier-2': '#94481A',
                    'tier-3': '#4F78C4',
                    'tier-4': '#AE7C00',
                    'tier-5': '#008F99',
                    'tier-6': '#8B48CF',
                    'race-hu': '#1689A6',
                    'race-oc': '#D06D69',
                    'race-ne': '#086A12',
                    'race-ud': '#7546BA',
                    'medal-gold': '#8F6B00',
                    'medal-silver': '#6E7881',
                    'heat-1': '#D0A076',
                    'heat-2': '#BA8351',
                    'heat-3': '#A3682E',
                    'heat-4': '#865017',
                    'heat-5': '#683C0B',
                },
                variables: {
                    'border-color': '#1A241E',
                    'border-opacity': 0.2,
                    'medium-emphasis-opacity': 0.7,
                },
            },
            dark: {
                dark: true,
                colors: {
                    background: '#151B17',
                    surface: '#1E2620',
                    'surface-bright': '#29322B',
                    'surface-light': '#273029',
                    'surface-variant': '#D5DBD1',
                    'on-surface-variant': '#1A241E',
                    'on-background': '#E7EBE3',
                    'on-surface': '#E7EBE3',
                    primary: '#D08B3C',
                    'primary-darken-1': '#B57430',
                    'on-primary': '#1A140C',
                    secondary: '#C3CCC1',
                    'secondary-darken-1': '#A7B1A4',
                    'on-secondary': '#1A241E',
                    error: '#E8836A',
                    warning: '#F0A04B',
                    info: '#7FB0DA',
                    success: '#6DB37A',
                    'primary-text': '#E3A45F',
                    band: '#0E1210',
                    'on-band': '#F2F4ED',
                    hero: '#332A1B',  // lighter than the page, so the hero stands out from it
                    'on-hero': '#F2F4ED',
                    'band-muted': '#B9C4B6',
                    tag: '#2C362F',
                    'on-tag': '#C3CCC1',
                    win: '#4F95D8',
                    loss: '#DE6E52',
                    draw: '#9DA89E',
                    'tier-1': '#58A833',
                    'tier-2': '#B0561F',
                    'tier-3': '#6F92DA',
                    'tier-4': '#BE8A00',
                    'tier-5': '#16A3A6',
                    'tier-6': '#A574E6',
                    'race-hu': '#02809C',
                    'race-oc': '#BA4C4B',
                    'race-ne': '#44AB46',
                    'race-ud': '#9B6FE4',
                    'medal-gold': '#E0B84A',
                    'medal-silver': '#B9C2C8',
                    'heat-1': '#784D25',
                    'heat-2': '#9C642F',
                    'heat-3': '#C37D39',
                    'heat-4': '#E29A57',
                    'heat-5': '#FABC86',
                    // Vuetify picks white on these mid-tone fills, which is under 3.4:1; ink is 4.75:1 or more
                    'on-error': '#1A241E',
                    'on-info': '#1A241E',
                    'on-success': '#1A241E',
                    'on-win': '#1A241E',
                    'on-loss': '#1A241E',
                    'on-draw': '#1A241E',
                    'on-tier-1': '#1A241E',
                    'on-tier-3': '#1A241E',
                    'on-tier-4': '#1A241E',
                    'on-tier-5': '#1A241E',
                    'on-tier-6': '#1A241E',
                },
                variables: {
                    'border-color': '#E7EBE3',
                    'border-opacity': 0.12,
                    'medium-emphasis-opacity': 0.7,
                },
            },
        },
    },
    icons: {
        defaultSet: 'mdi',
        aliases: { ...aliases, discord: `svg:${discordMark}` },
        sets: {
            mdi,
        },
    },
    components :{
        ...components,
    },
    directives,
    // A tooltip opens on tap as well as hover, so its text is reachable on a phone
    defaults: { VTooltip: { openOnClick: true } },
});

//App + Router
import App from './App.vue';
import { router } from './helpers';

const app = createApp(App);

function navigateInPage(to) {
    history.replaceState(null, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));  // the router and the login page re-read the URL
}

app
.component('RaceIcon', RaceIcon )
.component('RaceSelect', RaceSelect )
.component('FlagIcon', FlagIcon )
.component('CountrySelect', CountrySelect)
.component('PlayerName', PlayerName)

app.use(clerkPlugin, {
    publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    proxyUrl: import.meta.env.VITE_CLERK_PROXY_URL,  // set only where the production instance runs
    // Clerk's post-login navigation stays in the page; App.vue routes once the session lands
    routerPush: navigateInPage,
    routerReplace: navigateInPage,
    // the Account Portal does not exist on a vercel.app production domain; every flow stays on /login
    signInUrl: '/login',
    signUpUrl: '/login',
    afterSignOutUrl: '/login',
})
app.use(pinia)
app.use(vuetify)
app.use(router)

app.mount('#app')
