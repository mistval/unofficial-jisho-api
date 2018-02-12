# unofficial-jisho-api
This module encapsulates the official Jisho.org API and also provides kanji and example search features that scrape Jisho.org.

## Usage

### Word/phrase search (provided by official Jisho API)

This returns the same results as the official Jisho API. See the discussion of that here: http://jisho.org/forum/54fefc1f6e73340b1f160000-is-there-any-kind-of-search-api

```js
const jishoApi = new require('unofficial-jisho-api');
const jisho = new jishoApi();

jisho.searchForPhrase('日').then(result => {
  ...
  ...
  ...
});

```

### Kanji search

```js
const jishoApi = new require('unofficial-jisho-api');
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
  console.log('Stroke order diagram: ' + JSON.stringify(result.strokeOrderDiagramUri));
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
Parts: ["五","言","口"]
Stroke order diagram: "http://classic.jisho.org/static/images/stroke_diagrams/35486_frames.png"
Jisho Uri: http://jisho.org/search/%E8%AA%9E%23kanji
```

### Example search

```js
const jishoApi = new require('unofficial-jisho-api');
const jisho = new jishoApi();

jisho.searchForExamples('日').then(result => {
  console.log('Jisho Uri: ' + result.uri);
  console.log();

  for (let i = 0; i < 3; ++i) {
    let example = result.results[i];
    console.log(example.kanji);
    console.log(example.kana);
    console.log(example.english);
    console.log();
  }
});
```

This outputs the following:

```
Jisho Uri: http://jisho.org/search/%E6%97%A5%23sentences

日本人ならそんなことはけっしてしないでしょう
にほんじんならそんなことはけっしてしないでしょう
A Japanese person would never do such a thing.

今日はとても暑い
きょうはとてもあつい
It is very hot today.

日本には美しい都市が多い。例えば京都、奈良だ
にほんにはうつくしいとしがおおい。たとえばきょうと、奈良だ
Japan is full of beautiful cities. Kyoto and Nara, for instance.

```

Permission to scrape granted by Jisho's admin Kimtaro: http://jisho.org/forum/54fefc1f6e73340b1f160000-is-there-any-kind-of-search-api

For bugs or requested additional data, feel free to open an issue on the Github repo.