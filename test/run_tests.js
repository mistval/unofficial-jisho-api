import fs from 'fs';
import path, { dirname } from 'path';
import JishoAPI from '../index.js';
import chai from 'chai';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assert = chai.assert;

const jishoApi = new JishoAPI();

function getFilePaths(dirname) {
  const filenames = fs.readdirSync(path.join(__dirname, dirname));
  return filenames.map(filename => path.join(__dirname, dirname, filename));
}

// Jisho results are now ordered non-deterministically.
// We retry tests up to 10 times each to work around that.
async function retry(func) {
  let error;

  for (let i = 0; i < 10; ++i) {
    try {
      return await func();
    } catch (err) {
      error = err;
    }
  }

  throw error;
}

function runTestCases(testCaseFiles, apiFunction) {
  testCaseFiles.forEach((filePath) => {
    const testCase = JSON.parse(fs.readFileSync(filePath));
    it(`Matches expected response for ${testCase.query}.`, async function() {
      await retry(async () => {
        const result = await jishoApi[apiFunction](testCase.query);
        assert.deepEqual(JSON.parse(JSON.stringify(result, null, 2)), testCase.expectedResult);
      });
    }).timeout(10000);
  });
}

describe('Matches previously scraped results', function() {
  describe('Kanji test cases', function() {
    const testCaseFiles = getFilePaths('kanji_test_cases');
    runTestCases(testCaseFiles, 'searchForKanji');
  });

  describe('Example test cases', function() {
    const testCaseFiles = getFilePaths('example_test_cases');
    runTestCases(testCaseFiles, 'searchForExamples');
  });

  describe('Phrase scrape test cases', function() {
    const testCaseFiles = getFilePaths('phrase_scrape_test_cases');
    runTestCases(testCaseFiles, 'scrapeForPhrase');
  });
});

describe('Official Jisho API', function() {
  it('Does not error, has meta, has data', async function() {
    const result = await jishoApi.searchForPhrase('車');
    assert.containsAllKeys(result, ['meta', 'data']);
  }).timeout(10000);
});
