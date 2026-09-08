import base from 'country-code-info/data/countries.json';
import { withExtras, findCountry as find } from './countries.mjs';

export const countries = withExtras(base);
export const findCountry = (code) => find(countries, code);
