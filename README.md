![alt text](https://raw.githubusercontent.com/mistval/unofficial-jisho-api/master/logo.png "Logo")

# unofficial-jisho-api

This module encapsulates the official [Jisho.org](https://jisho.org/) API and also provides kanji and example search features that scrape [Jisho.org](https://jisho.org/).

## Installation

In a Node.js project:

`npm install unofficial-jisho-api`

## Basic usage

There's somewhat more detailed documentation [here](https://mistval.github.io/unofficial-jisho-api/), but the below examples should be sufficient.

### Word/phrase search (provided by official Jisho API)

This returns the same results as the official [Jisho.org](https://jisho.org/) API. See the discussion of that [here](http://jisho.org/forum/54fefc1f6e73340b1f160000-is-there-any-kind-of-search-api).

```js
const jishoApi = require('unofficial-jisho-api');
const jisho = new jishoApi();

jisho.searchForPhrase('日').then(result => {
  ...
  ...
  ...
});
```

### Kanji search

```js
const jishoApi = require('unofficial-jisho-api');
const jisho = new jishoApi();

jisho.searchForKanji('語').then(result => {
  console.log('Found: ' + result.found);
  console.log('Taught in: ' + result.taughtIn);
  console.log('JLPT level: ' + result.jlptLevel);
  console.log('Newspaper frequency rank: ' + result.newspaperFrequencyRank);
  console.log('Stroke count: ' + result.strokeCount);
  console.log('Meaning: ' + result.meaning);
  console.log('Kunyomi: ' + JSON.stringify(result.kunyomi));
  console.log('Kunyomi example: ' + JSON.stringify(result.kunyomiExamples[0]));
  console.log('Onyomi: ' + JSON.stringify(result.onyomi));
  console.log('Onyomi example: ' + JSON.stringify(result.onyomiExamples[0]));
  console.log('Radical: ' + JSON.stringify(result.radical));
  console.log('Parts: ' + JSON.stringify(result.parts));
  console.log('Stroke order diagram: ' + result.strokeOrderDiagramUri);
  console.log('Stroke order SVG: ' + result.strokeOrderSvgUri);
  console.log('Stroke order GIF: ' + result.strokeOrderGifUri);
  console.log('Jisho Uri: ' + result.uri);
});
```

This outputs the following:

```
Found: true
Taught in: grade 2
JLPT level: N5
Newspaper frequency rank: 301
Stroke count: 14
Meaning: word, speech, language
Kunyomi: ["かた.る","かた.らう"]
Kunyomi example: {"example":"語る","reading":"かたる","meaning":"to talk about, to speak of, to tell, to narrate, to recite, to chant, to indicate, to show"}
Onyomi: ["ゴ"]
Onyomi example: {"example":"語","reading":"ゴ","meaning":"language, word"}
Radical: {"symbol":"言","forms":["訁"],"meaning":"speech"}
Parts: ["口","五","言"]
Stroke order diagram: http://classic.jisho.org/static/images/stroke_diagrams/35486_frames.png
Stroke order SVG: http://d1w6u4xc3l95km.cloudfront.net/kanji-2015-03/08a9e.svg
Stroke order GIF: https://raw.githubusercontent.com/mistval/kotoba/master/resources/images/kanjianimations/08a9e_anim.gif
Jisho Uri: http://jisho.org/search/%E8%AA%9E%23kanji
```

### Example search

```js
const jishoApi = require('unofficial-jisho-api');
const jisho = new jishoApi();

jisho.searchForExamples('日').then(result => {
  console.log('Jisho Uri: ' + result.uri);
  console.log();

  for (let i = 0; i < 3; ++i) {
    let example = result.results[i];
    console.log(example.kanji);
    console.log(example.kana);
    console.log(example.english);
    console.log(JSON.stringify(example.pieces));
    console.log();
  }
});
```

This outputs the following:

```
Jisho Uri: http://jisho.org/search/%E6%97%A5%23sentences

日本人ならそんなことはけっしてしないでしょう。
にほんじんならそんなことはけっしてしないでしょう。
A Japanese person would never do such a thing.
[{"lifted":"にほんじん","unlifted":"日本人"},{"lifted":"","unlifted":"なら"},{"lifted":"","unlifted":"そんな"},{"lifted":"","unlifted":"こと"},{"lifted":"","unlifted":"は"},{"lifted":"","unlifted":"けっして"},{"lifted":"","unlifted":"しない"},{"lifted":"","
unlifted":"でしょう"}]

今日はとても暑い。
きょうはとてもあつい。
It is very hot today.
[{"lifted":"きょう","unlifted":"今日"},{"lifted":"","unlifted":"は"},{"lifted":"","unlifted":"とても"},{"lifted":"あつ","unlifted":"暑い"}]

日本には美しい都市が多い。例えば京都、奈良だ。
にほんにはうつくしいとしがおおい。たとえばきょうと、奈良だ。
Japan is full of beautiful cities. Kyoto and Nara, for instance.
[{"lifted":"にほん","unlifted":"日本"},{"lifted":"","unlifted":"には"},{"lifted":"うつく","unlifted":"美しい"},{"lifted":"とし","unlifted":"都市"},{"lifted":"","unlifted":"が"},{"lifted":"おお","unlifted":"多い"},{"lifted":"たと","unlifted":"例えば"},{"lift
ed":"きょうと","unlifted":"京都"},{"lifted":"","unlifted":"だ"}]
```

### Word/phrase scraping

This scrapes the word/phrase page on Jisho.org. This can get you some data that the official API doesn't have, such as JLPT level and part-of-speech. The official API (`searchForPhrase`) should be preferred if it has the data you need.

```js
const jishoApi = require('unofficial-jisho-api');
const jisho = new jishoApi();

jisho.scrapeForPhrase('谷').then((data) => {
  console.log(JSON.stringify(data, null, 2));
});
```

This outputs the following:

```json
{
  "found": true,
  "tags": [
    "Common word",
    "JLPT N3",
    "Wanikani level 5"
  ],
  "meanings": [
    {
      "seeAlsoTerms": [],
      "sentences": [],
      "definition": "valley",
      "supplemental": [],
      "definitionAbstract": "",
      "tags": [
        "noun"
      ]
    },
    {
      "seeAlsoTerms": [],
      "sentences": [],
      "definition": "Valley",
      "supplemental": [],
      "definitionAbstract": "In geology, a valley or dale is a depression with predominant extent in one direction. A very deep river valley may be called a canyon or gorge. The terms U-shaped and V-shaped are descriptive terms of geography to characterize the form of valleys. Most valleys belong to one of these two main types or a mixture of them, (at least) with respect of the cross section of the slopes or hillsides.",
      "tags": [
        "wikipedia definition"
      ]
    }
  ],
  "otherForms": [
    {
      "kanji": "渓",
      "kana": "たに"
    },
    {
      "kanji": "谿",
      "kana": "たに"
    }
  ],
  "query": "谷",
  "uri": "https://jisho.org/word/%E8%B0%B7"
}
```

## Request options

Optionally, you can provide options, such as timeout and proxy, to use for requests. The options are passed directly to the [request module](https://www.npmjs.com/package/request). See its [documentation](https://www.npmjs.com/package/request) for a full list of options.

If you provide an options object to the jishoApi constructor, those options will be used for all requests. Alternatively, you can provide the options as the second argument to the searchForPhrase, searchForKanji, or searchForExamples functions, and the options will only be used for that specific request. If you provide options in both manners, the options will be merged, with the options passed to the function taking precedence if the two are in conflict.

### Use a proxy for all requests

```js
const jishoApi = require('unofficial-jisho-api');
const jisho = new jishoApi({ proxy: 'http://99.99.99.99:9999' });

// Your code
```

### Use a proxy and custom timeout for a single request

```js
const jishoApi = require('unofficial-jisho-api');
const jisho = new jishoApi();

jisho.searchForPhrase('日', { proxy: 'http://99.99.99.99:9999', timeout: 15000 }).then(result => {
  ...
  ...
  ...
});
```

## Parsing HTML strings

If the internal requests are having trouble reaching Jisho.org (due to CORS blocking or something), you can get the HTML bodies from Jisho yourself and pass them into this module's parsing functions as demonstrated in the examples below.

### Parse kanji page HTML

```js
const request = require('request');
const jishoApi = require('unofficial-jisho-api');
const jisho = new jishoApi();

const SEARCH_KANJI = '車';
const SEARCH_URI = jisho.getUriForKanjiSearch(SEARCH_KANJI);

request(SEARCH_URI, (error, response, body) => {
  const json = jisho.parseKanjiPageHtml(body, SEARCH_KANJI);
  console.log(`JLPT level: ${json.jlptLevel}`);
  console.log(`Stroke count: ${json.strokeCount}`);
  console.log(`Meaning: ${json.meaning}`);
});
```

### Parse example page HTML

```js
const request = require('request');
const jishoApi = require('unofficial-jisho-api');
const jisho = new jishoApi();

const SEARCH_EXAMPLE = '保護者';
const SEARCH_URI = jisho.getUriForExampleSearch(SEARCH_EXAMPLE);

request(SEARCH_URI, (error, response, body) => {
  const json = jisho.parseExamplePageHtml(body, SEARCH_EXAMPLE);
  console.log(`English: ${json.results[0].english}`);
  console.log(`Kanji ${json.results[0].kanji}`);
  console.log(`Kana: ${json.results[0].kana}`);
});
```

### Parse phrase page HTML

```js
const request = require('request');
const jishoApi = require('unofficial-jisho-api');
const jisho = new jishoApi();

const SEARCH_EXAMPLE = '保護者';
const SEARCH_URI = jisho.getUriForPhraseScrape(SEARCH_EXAMPLE);

request(SEARCH_URI, (error, response, body) => {
  const json = jisho.parsePhraseScrapeHtml(body, SEARCH_EXAMPLE);
  console.log(JSON.stringify(json, null, 2));
});
```

## About

Permission to scrape granted by Jisho's admin Kimtaro: http://jisho.org/forum/54fefc1f6e73340b1f160000-is-there-any-kind-of-search-api

For bugs or requested additional data, feel free to open an issue on the Github repo.
