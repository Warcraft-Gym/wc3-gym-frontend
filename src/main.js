import { createApp } from 'vue';

import '@mdi/font/css/materialdesignicons.css'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

//Countries API
import 'flagpack/dist/flagpack.css'

//Pinia
import { createPinia } from 'pinia';

const pinia = createPinia();

//Vuetify
import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createVuetify } from 'vuetify';


//Components
import RaceIcon from '@/components/RaceIcon.vue'
import RaceSelect from '@/components/RaceSelect.vue'
import FlagIcon from '@/components/FlagIcon.vue'
import CountrySelect from '@/components/CountrySelect.vue'

const vuetify = new createVuetify ({
    theme: {
        defaultTheme: 'light',
    },
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
        },
    },
    components :{
        ...components,
    },
    directives
});

//App + Router
import App from './App.vue';
import { router } from './helpers';

const app = createApp(App);

app
.component('RaceIcon', RaceIcon )
.component('RaceSelect', RaceSelect )
.component('FlagIcon', FlagIcon )
.component('CountrySelect', CountrySelect)

app.use(pinia)
app.use(vuetify)
app.use(router)

app.mount('#app')
