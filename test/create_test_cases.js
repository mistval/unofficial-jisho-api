import JishoAPI from './../index.js';
import path from 'path';
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const jisho = new JishoAPI();

async function createTestCases(outputDir, queries, searchFuncName) {
  for (let i = 0; i < queries.length; i += 1) {
    const query = queries[i];
    const result = await jisho[searchFuncName](query);
    const testCaseStr = JSON.stringify({ query, expectedResult: result }, null, 2);

    await fs.promises.writeFile(path.join(outputDir, `${i}.json`), testCaseStr);
  }
}

function createKanjiTestCases() {
  const queries = ['車', '家', '楽', '極上', '贄', 'ネガティブ', 'wegmwrlgkrgmg', '水'];
  const outputDir = path.join(__dirname, 'kanji_test_cases');
  return createTestCases(outputDir, queries, 'searchForKanji');
}

async function createExampleTestCases() {
  const queries = ['車', '日本人', '彼＊叩く', '皆', 'ネガティブ', 'grlgmregmneriireg'];
  const outputDir = path.join(__dirname, 'example_test_cases');
  return createTestCases(outputDir, queries, 'searchForExamples');
}

async function createPhraseScrapeTestCases() {
  const queries = ['車', '日本人', '皆', 'ネガティブ', 'grlgmregmneriireg'];
  const outputDir = path.join(__dirname, 'phrase_scrape_test_cases');
  return createTestCases(outputDir, queries, 'scrapeForPhrase');
}

function go() {
  return Promise.all([
    createKanjiTestCases(),
    createExampleTestCases(),
    createPhraseScrapeTestCases(),
  ]);
}

go().catch(err => console.warn(err));
