import base from 'country-code-info/data/countries.json';
import { withNations, findCountry as find } from './countries.mjs';

export const countries = withNations(base);
export const findCountry = (code) => find(countries, code);
