/* eslint-env node */
module.exports = {
    "root": true,
    "extends": [
        "plugin:vue/vue3-essential",
        "eslint:recommended"
    ],
    "env": {
        "vue/setup-compiler-macros": true
    },
    "globals": {
        "defineModel": "readonly"
    },
    "rules": {
        "vue/valid-v-slot": ["error", { "allowModifiers": true }]
    }
}
