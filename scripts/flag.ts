/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable import/no-extraneous-dependencies */
import axios from 'axios';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { ICountry } from '../src/types';
import countries from './countries.json';

const countryMap = {} as Record<string, ICountry>;

countries.forEach((c) => {
  const d = c as ICountry;
  countryMap[d.alpha2] = d;
});

export interface ICountryData {
  alpha2: string;
  alpha3: string;
  countryCallingCodes: string[];
  currencies: string[];
  emoji?: string;
  ioc: string;
  languages: string[];
  name: string;
  status: Status;
}

export enum Status {
  Assigned = 'assigned',
  Deleted = 'deleted',
  Reserved = 'reserved',
  UserAssigned = 'user assigned',
}

(async () => {
  const { data } = await axios.get<ICountryData[]>(
    'https://raw.githubusercontent.com/PayU/country-data/master/data/countries.json'
  );

  data.forEach(({ alpha2, countryCallingCodes, currencies, emoji, ioc }) => {
    const item = countryMap[alpha2];
    if (!item) return;

    if (countryCallingCodes && countryCallingCodes.length)
      item.callingCodes = countryCallingCodes.map((x) =>
        x.replace(/\D+/g, ' ').trim()
      );

    if (currencies && currencies.length) item.currencies = currencies;

    if (ioc) item.ioc = ioc;

    if (emoji) item.emoji = emoji;
  });

  const newCountries = countries.map((item) => {
    const d = item;

    if (d.languages)
      d.languages = d.languages.map((x) => ({
        alpha2: !x.alpha2 || x.alpha2 === '-' ? '' : x.alpha2,
        alpha3: !x.alpha3 || x.alpha3 === '-' ? '' : x.alpha3,
      }));

    const clone = {} as any;

    Object.keys(item)
      .sort()
      .forEach((key) => {
        let val = item[key as keyof typeof item];
        if (typeof val === 'string') {
          val = val
            .replace(/\*/g, '')
            .split(/\s*,\s*/g)
            .join(', ')
            .trim()
            .replace(/\s+/g, ' ');
        }
        clone[key] = val;
      });

    return clone;
  });

  writeFileSync(
    resolve(__dirname, './countries.json'),
    JSON.stringify(newCountries, null, 2)
  );

  process.exit();
})();
