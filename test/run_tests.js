const fs = require('fs');
const path = require('path');
const JishoApi = require('../index.js');
const assert = require('chai').assert;

const jishoApi = new JishoApi();

function getFilePaths(dirname) {
  const filenames = fs.readdirSync(path.join(__dirname, dirname));
  return filenames.map(filename => path.join(__dirname, dirname, filename));
}

function runTestCases(testCaseFiles, apiFunction) {
  testCaseFiles.forEach((filePath) => {
    const testCase = require(filePath);
    it(`Matches expected response for ${testCase.query}.`, async function() {
      const result = await jishoApi[apiFunction](testCase.query);
      assert.deepEqual(JSON.parse(JSON.stringify(result, null, 2)), testCase.expectedResult);
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
