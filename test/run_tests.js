const fs = require('fs');
const path = require('path');
const JishoApi = require('../index.js');
const assert = require('chai').assert;

const jishoApi = new JishoApi();

function getFilePaths(dirname) {
  const filenames = fs.readdirSync(path.join(__dirname, dirname));
  return filenames.map(filename => path.join(__dirname, dirname, filename));
}

describe('Matches previously scraped results', function() {
  describe('Kanji test cases', function() {
    const testCaseFiles = getFilePaths('kanji_test_cases');
    testCaseFiles.forEach((filePath) => {
      const testCase = require(filePath);
      it(`Matches expected response for ${testCase.query}.`, async function() {
        const result = await jishoApi.searchForKanji(testCase.query);
        assert.equal(JSON.stringify(result, null, 2), JSON.stringify(testCase.expectedResult, null, 2));
      }).timeout(10000);
    });
  });

  describe('Example test cases', function() {
    const testCaseFiles = getFilePaths('example_test_cases');
    testCaseFiles.forEach((filePath) => {
      const testCase = require(filePath);
      it(`Matches expected response for ${testCase.query}.`, async function() {
        const result = await jishoApi.searchForExamples(testCase.query);
        assert.equal(JSON.stringify(result, null, 2), JSON.stringify(testCase.expectedResult, null, 2));
      }).timeout(10000);
    });
  });

  describe('Phrase scrape test cases', function() {
    const testCaseFiles = getFilePaths('phrase_scrape_test_cases');
    testCaseFiles.forEach((filePath) => {
      const testCase = require(filePath);
      it(`Matches expected response for ${testCase.query}.`, async function() {
        const result = await jishoApi.scrapeForPhrase(testCase.query);
        assert.equal(JSON.stringify(result, null, 2), JSON.stringify(testCase.expectedResult, null, 2));
      }).timeout(10000);
    });
  });
});

describe('Official Jisho API', function() {
  it('Does not error, has meta, has data', async function() {
    const result = await jishoApi.searchForPhrase('車');
    assert.containsAllKeys(result, ['meta', 'data']);
  }).timeout(10000);
});
