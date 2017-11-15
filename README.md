# unofficial-jisho-api
This module encapsulates the official Jisho.org API and also provides kanji and example search features that that scrape Jisho.org.

## Usage

### Word/phrase search (provided by official Jisho API)

This returns the same results as the official Jisho API. See the discussion of that here: http://jisho.org/forum/54fefc1f6e73340b1f160000-is-there-any-kind-of-search-api

```js
const jishoApi = new require('./index.js');
const jisho = new jishoApi();

jisho.searchForPhrase('日').then(result => {
  ...
  ...
  ...
});

```

### Kanji search

```js
const jishoApi = new require('./index.js');
const jisho = new jishoApi();

jisho.searchForKanji('日').then(result => {
  console.log('Found: ' + result.found);
  console.log('Grade number: ' + result.gradeNumber);
  console.log('Level: ' + result.level);
  console.log('Stroke count: ' + result.strokeCount);
  console.log('Meaning: ' + result.meaning);
  console.log('Kunyomi: ' + JSON.stringify(result.kunyomi));
  console.log('Kunyomi example: ' + JSON.stringify(result.kunyomiExamples[0]));
  console.log('Onyomi: ' + JSON.stringify(result.onyomi));
  console.log('Onyomi example: ' + JSON.stringify(result.onyomiExamples[0]));
  console.log('Radical: ' + JSON.stringify(result.radical));
  console.log('Parts: ' + JSON.stringify(result.parts));
  console.log('Stroke order diagram: ' + JSON.stringify(result.strokeOrderDiagramUri));
});
```

This outputs the following:

```
Found: true
Grade number: 1
Level: grade 1
Stroke count: 4
Meaning: day, sun, Japan, counter for days
Kunyomi: ["ひ","-び","-か"]
Kunyomi example: {"example":"日","reading":"ひ","meaning":"day, days, sun, sunshine, sunlight, case (esp. unfortunate), event"}
Onyomi: ["ニチ","ジツ"]
Onyomi example: {"example":"日","reading":"ニチ","meaning":"Sunday, day (of the month), counter for days, Japan"}
Radical: {"symbol":"日","meaning":"sun, day"}
Parts: ["日"]
Stroke order diagram: "http://classic.jisho.org/static/images/stroke_diagrams/26085_frames.png"
```

### Example search

```js
const jishoApi = new require('./index.js');
const jisho = new jishoApi();

jisho.searchForExamples('日').then(result => {
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