/* eslint-disable no-continue */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable import/no-extraneous-dependencies, no-await-in-loop, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call */
// import axios from 'axios';
import cheerio from 'cheerio';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import puppeteer from 'puppeteer';
import { ICountry } from '../src/types';
import countries from './countries.json';
import { tableHtml } from './table';

const prevList = countries as ICountry[];

// type ItemType<T extends any[]> = T extends (infer R)[] ? R : never;

export interface IRawCountry {
  alpha2: string;
  shortName: string;
  shortNameLowerCase: string;
  fullName: string;
  alpha3: string;
  numeric: string;
  remarks: '';
  independent: 'Yes' | 'No';
  territory: string;
  status: 'Officially assigned';
  statusRemark?: string;
  remark1?: string;
  remark2?: string;
  remark3?: string;
  languages?: {
    alpha2: string;
    alpha3: string;
  }[];
}

const $table = cheerio.load(tableHtml, { decodeEntities: true });
// console.log(tableHtml);

const alpha2Map = {} as Record<string, 1>;
const fetched = {} as Record<string, 1>;

prevList.forEach((item) => {
  fetched[item.alpha2] = 1;
});

const addCountry = (item: ICountry) => {
  const index = prevList.findIndex((x) => x.alpha2 === item.alpha2);
  if (index === -1) {
    prevList.push(item);
  } else {
    prevList[index] = item;
  }
};

$table('tr td:nth-child(3)').each((_i, el) => {
  alpha2Map[$table(el).text().trim()] = 1;
});

// console.log($table.each);

const keyMap: Record<string, string> = {
  'Alpha-2 code': 'alpha2',
  'Short name': 'shortName',
  'Short name lower case': 'shortNameLowerCase',
  'Full name': 'fullName',
  'Alpha-3 code': 'alpha3',
  'Numeric code': 'numeric',
  Remarks: 'remarks',
  Independent: 'independent',
  'Territory name': 'territory',
  Status: 'status',
  'Status remark': 'statusRemark',
  'Remark part 1': 'remark1',
  'Remark part 2': 'remark2',
  'Remark part 3': 'remark3',
};

const format = ({
  alpha2,
  // shortName,
  shortNameLowerCase,
  fullName,
  alpha3,
  numeric,
  // remarks,
  // independent,
  territory,
  // status,
  // statusRemark,
  // remark1,
  // remark2,
  // remark3,
  languages,
}: IRawCountry): ICountry => {
  const formatted = {
    alpha2,
    alpha3,
    shortName: shortNameLowerCase,
  } as ICountry;

  if (fullName) formatted.fullName = fullName;
  if (numeric) formatted.numeric = numeric;
  if (territory) formatted.territory = territory;
  if (languages && languages.length) formatted.languages = languages;

  return formatted;
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  const browser = await puppeteer.launch();

  const codes = Object.keys(alpha2Map);

  for (let ci = 0, cl = codes.length; ci < cl; ci += 1) {
    const code = codes[ci];

    if (fetched[code] === 1) continue;

    const page = await browser.newPage();
    await page.goto(`https://www.iso.org/obp/ui/#iso:code:3166:${code}`);
    await page.waitForSelector('.core-view-summary');

    const $ = cheerio.load(await page.content());

    const item = {} as IRawCountry;

    $('.core-view-summary .core-view-line')
      .toArray()
      .forEach((line) => {
        const name = $(line).find('.core-view-field-name').text().trim();

        const value = $(line)
          .find('.core-view-field-value')
          .text()
          .trim()
          .replace(/\*/g, '')
          .replace(/\s+/g, ' ');

        if (!(name in keyMap)) {
          console.log('new key', name);
        }

        const key = keyMap[name] || name;

        (item as any)[key] = value;
      });

    await page.waitForSelector('#country-additional-info');

    $('#country-additional-info tbody tr')
      .toArray()
      .forEach((tr) => {
        const [alpha2, alpha3] = $(tr)
          .find('td')
          .toArray()
          .map((el) => $(el).text().trim());

        (item.languages || (item.languages = [])).push({
          alpha2: !alpha2 || alpha2 === '-' ? '' : alpha2,
          alpha3: !alpha3 || alpha3 === '-' ? '' : alpha3,
        });
      });

    const formatted = format(item);

    addCountry(formatted);

    prevList.sort((a, b) => a.alpha2.localeCompare(b.alpha2));

    writeFileSync(
      resolve(__dirname, './countries.json'),
      JSON.stringify(prevList, null, 2)
    );

    console.log(`${JSON.stringify(formatted, null, 2)},`);

    await page.close();
  }

  // other actions...
  await browser.close();

  process.exit();
})();
