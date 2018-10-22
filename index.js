/*
 * This module encapsulates the official Jisho.org API
 * and also provides kanji and example search features that scrape Jisho.org.
 * Permission to scrape granted by Jisho's admin Kimtaro:
 *     http://jisho.org/forum/54fefc1f6e73340b1f160000-is-there-any-kind-of-search-api
 *
 * Use of regular expressions was mostly avoided in early commits.
 * I was curious to see how far I could get without using them.
 * Later commits do use regular expressions because I got tired of that experiment,
 * and was afraid it makes me look bad ;)
 */

const request = require('request-promise');
const { XmlEntities } = require('html-entities');
const htmlparser = require('htmlparser');

const JISHO_API = 'http://jisho.org/api/v1/search/words';
const SCRAPE_BASE_URI = 'http://jisho.org/search/';
const STROKE_ORDER_DIAGRAM_BASE_URI = 'http://classic.jisho.org/static/images/stroke_diagrams/';

const htmlEntities = new XmlEntities();

/* KANJI SEARCH FUNCTIONS START */

const ONYOMI_LOCATOR_SYMBOL = 'On';
const KUNYOMI_LOCATOR_SYMBOL = 'Kun';

function superTrim(str) {
  if (!str) {
    return undefined;
  }
  return str.replace(/(?:\r\n|\r|\n)/g, '').trim();
}

function uriForKanjiSearch(kanji) {
  return `${SCRAPE_BASE_URI}${encodeURIComponent(kanji)}%23kanji`;
}

function getUriForStrokeOrderDiagram(kanji) {
  return `${STROKE_ORDER_DIAGRAM_BASE_URI}${kanji.charCodeAt(0).toString()}_frames.png`;
}

function containsKanjiGlyph(pageHtml, kanji) {
  const kanjiGlyphToken = `<h1 class="character" data-area-name="print" lang="ja">${kanji}</h1>`;
  return pageHtml.indexOf(kanjiGlyphToken) !== -1;
}

function getStringBetweenIndicies(data, startIndex, endIndex) {
  const result = data.substring(startIndex, endIndex);
  return superTrim(result);
}

function getStringBetweenStrings(data, startString, endString) {
  const startStringLocation = data.indexOf(startString);
  if (startStringLocation === -1) {
    return undefined;
  }
  const startIndex = startStringLocation + startString.length;
  const endIndex = data.indexOf(endString, startIndex);
  if (endIndex >= 0) {
    return getStringBetweenIndicies(data, startIndex, endIndex);
  }

  return undefined;
}

function getStringBetweenStringsReverse(data, startString, endString) {
  const endStringLocation = data.indexOf(endString);
  let startStringLocation = data.indexOf(startString);

  if (startStringLocation === -1 || endStringLocation === -1) {
    return undefined;
  }

  let nextStartSearchIndex = startStringLocation + 1;
  let previousStartStringLocation = startStringLocation;
  while (startStringLocation < endStringLocation && nextStartSearchIndex !== 0) {
    previousStartStringLocation = startStringLocation;
    startStringLocation = data.indexOf(startString, nextStartSearchIndex);
    nextStartSearchIndex = startStringLocation + 1;
  }
  startStringLocation = previousStartStringLocation;

  return data.substring(startStringLocation + startString.length, endStringLocation);
}

function getIntBetweenStrings(pageHtml, startString, endString) {
  const stringBetweenStrings = getStringBetweenStrings(pageHtml, startString, endString);
  if (stringBetweenStrings) {
    return parseInt(stringBetweenStrings, 10);
  }

  return undefined;
}

function parseAnchorsToArray(str) {
  const closeAnchor = '</a>';
  let rest = str;
  const results = [];

  while (rest.indexOf('<') !== -1) {
    const result = getStringBetweenStrings(rest, '>', '<');
    results.push(result);
    rest = rest.substring(rest.indexOf(closeAnchor) + closeAnchor.length);
  }

  return results;
}

function getYomi(pageHtml, yomiLocatorSymbol) {
  const yomiSection = getStringBetweenStrings(pageHtml, `<dt>${yomiLocatorSymbol}:</dt>`, '</dl>');
  if (yomiSection) {
    const yomiString = getStringBetweenStrings(yomiSection, '<dd class="kanji-details__main-readings-list" lang="ja">', '</dd>');
    if (yomiString) {
      const readings = parseAnchorsToArray(yomiString);
      return readings;
    }
  }
  return [];
}

function getKunyomi(pageHtml) {
  return getYomi(pageHtml, KUNYOMI_LOCATOR_SYMBOL);
}

function getOnyomi(pageHtml) {
  return getYomi(pageHtml, ONYOMI_LOCATOR_SYMBOL);
}

function getYomiExamples(pageHtml, yomiLocatorSymbol) {
  const locatorString = `<h2>${yomiLocatorSymbol} reading compounds</h2>`;
  const exampleSectionStartIndex = pageHtml.indexOf(locatorString);
  const exampleSectionEndIndex = pageHtml.indexOf('</ul>', exampleSectionStartIndex);
  if (exampleSectionStartIndex === -1 || exampleSectionEndIndex === -1) {
    return [];
  }

  let exampleSection = pageHtml.substring(exampleSectionStartIndex, exampleSectionEndIndex);
  exampleSection = exampleSection.replace(locatorString, '');
  exampleSection = exampleSection.replace('<ul class="no-bullet">', '');

  let examplesLines = exampleSection.split('\n');
  examplesLines = examplesLines.map(line => superTrim(line));
  while (examplesLines[0] !== '<li>') {
    examplesLines.shift();
  }
  while (examplesLines[examplesLines.length - 1] !== '</li>') {
    examplesLines.pop();
  }

  const examples = [];
  let exampleIndex = 0;
  const lengthOfExampleInLines = 5;
  const exampleOffset = 1;
  const readingOffset = 2;
  const meaningOffset = 3;
  for (let i = 0; i < examplesLines.length; i += lengthOfExampleInLines) {
    examples[exampleIndex] = {
      example: examplesLines[i + exampleOffset],
      reading: examplesLines[i + readingOffset].replace('【', '').replace('】', ''),
      meaning: htmlEntities.decode(examplesLines[i + meaningOffset]),
    };
    exampleIndex += 1;
  }

  return examples;
}

function getOnyomiExamples(pageHtml) {
  return getYomiExamples(pageHtml, ONYOMI_LOCATOR_SYMBOL);
}

function getKunyomiExamples(pageHtml) {
  return getYomiExamples(pageHtml, KUNYOMI_LOCATOR_SYMBOL);
}

function getRadical(pageHtml) {
  const radicalMeaningStartString = '<span class="radical_meaning">';
  const radicalMeaningEndString = '</span>';

  const radicalMeaning = getStringBetweenStrings(
    pageHtml,
    radicalMeaningStartString,
    radicalMeaningEndString,
  );

  if (radicalMeaning) {
    const radicalMeaningStartIndex = pageHtml.indexOf(radicalMeaningStartString);

    const radicalMeaningEndIndex = pageHtml.indexOf(
      radicalMeaningEndString,
      radicalMeaningStartIndex,
    );

    const radicalSymbolStartIndex = radicalMeaningEndIndex + radicalMeaningEndString.length;
    const radicalSymbolEndString = '</span>';
    const radicalSymbolEndIndex = pageHtml.indexOf(radicalSymbolEndString, radicalSymbolStartIndex);

    const radicalSymbolsString = getStringBetweenIndicies(
      pageHtml,
      radicalSymbolStartIndex,
      radicalSymbolEndIndex,
    );

    if (radicalSymbolsString.length > 1) {
      const radicalForms = radicalSymbolsString
        .substring(1)
        .replace('(', '')
        .replace(')', '')
        .trim()
        .split(', ');

      return { symbol: radicalSymbolsString[0], forms: radicalForms, meaning: radicalMeaning };
    }

    return { symbol: radicalSymbolsString, meaning: radicalMeaning };
  }

  return undefined;
}

function getParts(pageHtml) {
  const partsSectionStartString = '<dt>Parts:</dt>';
  const partsSectionEndString = '</dl>';

  let partsSection = getStringBetweenStrings(
    pageHtml,
    partsSectionStartString,
    partsSectionEndString,
  );

  partsSection = partsSection.replace('<dd>', '').replace('</dd>', '');
  return parseAnchorsToArray(partsSection);
}

function getSvgUri(pageHtml) {
  const svgRegex = /\/\/.*?.cloudfront.net\/.*?.svg/;
  const regexResult = svgRegex.exec(pageHtml);
  if (regexResult) {
    return `http:${regexResult[0]}`;
  }

  return undefined;
}

function getGifUri(kanji) {
  const fileCodeStringLength = 5;
  const unicodeString = kanji.codePointAt(0).toString(16);
  const fillZeroes = fileCodeStringLength - unicodeString.length;
  const fileCode = new Array(fillZeroes + 1).join('0') + unicodeString;
  const fileName = `${fileCode}_anim.gif`;
  const animationUri = `https://raw.githubusercontent.com/mistval/kotoba/master/resources/images/kanjianimations/${fileName}`;

  return animationUri;
}

function parseKanjiPageData(pageHtml, kanji) {
  const result = {};
  result.query = kanji;
  result.found = containsKanjiGlyph(pageHtml, kanji);
  if (!result.found) {
    return result;
  }

  result.taughtIn = getStringBetweenStrings(pageHtml, 'taught in <strong>', '</strong>');
  result.jlptLevel = getStringBetweenStrings(pageHtml, 'JLPT level <strong>', '</strong>');
  result.newspaperFrequencyRank = getStringBetweenStringsReverse(pageHtml, '<strong>', '</strong> of 2500 most used kanji in newspapers');
  result.strokeCount = getIntBetweenStrings(pageHtml, '<strong>', '</strong> strokes');
  result.meaning = htmlEntities.decode(superTrim(getStringBetweenStrings(pageHtml, '<div class="kanji-details__main-meanings">', '</div>')));
  result.kunyomi = getKunyomi(pageHtml);
  result.onyomi = getOnyomi(pageHtml);
  result.onyomiExamples = getOnyomiExamples(pageHtml);
  result.kunyomiExamples = getKunyomiExamples(pageHtml);
  result.radical = getRadical(pageHtml);
  result.parts = getParts(pageHtml);
  result.strokeOrderDiagramUri = getUriForStrokeOrderDiagram(kanji);
  result.strokeOrderSvgUri = getSvgUri(pageHtml);
  result.strokeOrderGifUri = getGifUri(kanji);
  result.uri = uriForKanjiSearch(kanji);
  return result;
}

/* KANJI SEARCH FUNCTIONS END */

/* EXAMPLE SEARCH FUNCTIONS START */

const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf]/g;

function uriForExampleSearch(phrase) {
  return `${SCRAPE_BASE_URI}${encodeURIComponent(phrase)}%23sentences`;
}

function parseKanjiLine(japaneseSectionDom) {
  const result = [];
  for (let i = 0; i < japaneseSectionDom.length - 1; i += 1) {
    const kanjiFuriganaPair = japaneseSectionDom[i].children;
    if (kanjiFuriganaPair) {
      result.push(kanjiFuriganaPair[kanjiFuriganaPair.length - 1].children[0].raw);
    } else {
      const kanji = japaneseSectionDom[i].raw.replace(/\\n/g, '').trim();
      if (!kanji) {
        result.push(undefined);
      } else {
        result.push(kanji);
      }
    }
  }

  return result;
}

function parseKanaLine(japaneseSectionDom, parsedKanjiLine) {
  const result = [];
  for (let i = 0; i < japaneseSectionDom.length - 1; i += 1) {
    const kanjiFuriganaPair = japaneseSectionDom[i].children;
    if (kanjiFuriganaPair && kanjiFuriganaPair[0].children) {
      const kana = kanjiFuriganaPair[0].children[0].raw;
      const kanji = parsedKanjiLine[i];
      const kanjiRegexMatches = kanji.match(kanjiRegex);
      if (kanji.startsWith(kana)) {
        result.push(kanji);
      } else if (kanjiRegexMatches) {
        const lastMatch = kanjiRegexMatches[kanjiRegexMatches.length - 1];
        const lastMatchIndex = kanji.lastIndexOf(lastMatch);
        const nonFuriPart = kanji.substring(lastMatchIndex + 1);
        result.push(kana + nonFuriPart);
      } else {
        result.push(kanji);
      }
    } else if (parsedKanjiLine[i]) {
      result.push(parsedKanjiLine[i]);
    }
  }

  return result;
}

function getExampleEnglish(exampleSectionHtml) {
  const englishSectionStartString = '<span class="english">';
  const englishSectionEndString = '</span';

  const englishSectionStartIndex = exampleSectionHtml.indexOf(englishSectionStartString)
    + englishSectionStartString.length;

  const englishSectionEndIndex = exampleSectionHtml.indexOf(
    englishSectionEndString,
    englishSectionStartIndex,
  );

  return exampleSectionHtml.substring(englishSectionStartIndex, englishSectionEndIndex);
}

function getKanjiAndKana(exampleSectionHtml) {
  const japaneseSectionStartString = '<ul class="japanese_sentence japanese japanese_gothic clearfix" lang="ja">';
  const japaneseSectionEndString = '</ul>';

  const japaneseSectionStartIndex = exampleSectionHtml.indexOf(japaneseSectionStartString)
    + japaneseSectionStartString.length;

  const japaneseSectionEndIndex = exampleSectionHtml.indexOf(japaneseSectionEndString);

  const japaneseSectionText = exampleSectionHtml.substring(
    japaneseSectionStartIndex,
    japaneseSectionEndIndex,
  );

  const parseHandler = new htmlparser.DefaultHandler((() => {}));
  const parser = new htmlparser.Parser(parseHandler);
  parser.parseComplete(japaneseSectionText);
  const japaneseDom = parseHandler.dom;

  const parsedKanjiLine = parseKanjiLine(japaneseDom);

  const kanji = parsedKanjiLine.join('');
  const kana = parseKanaLine(japaneseDom, parsedKanjiLine).join('');

  return { kanji, kana };
}

function parseExampleSection(exampleSectionHtml) {
  const english = getExampleEnglish(exampleSectionHtml);
  const { kanji, kana } = getKanjiAndKana(exampleSectionHtml);

  return {
    english,
    kanji,
    kana,
  };
}

function parseExamplePageData(pageHtml, phrase) {
  const results = [];
  const exampleSectionStartString = '<ul class="japanese_sentence japanese japanese_gothic clearfix" lang="ja">';
  const exampleSectionEndString = '<span class="inline_copyright">';
  let exampleSectionStartIndex = 0;
  while (true) {
    // +1 to move to the next instance of sectionStartString.
    // Otherwise we'd infinite loop finding the same one over and over.
    exampleSectionStartIndex = pageHtml.indexOf(
      exampleSectionStartString,
      exampleSectionStartIndex,
    ) + 1;

    const exampleSectionEndIndex = pageHtml.indexOf(
      exampleSectionEndString,
      exampleSectionStartIndex,
    );

    if (exampleSectionStartIndex !== 0 && exampleSectionEndIndex !== -1) {
      const exampleSection = pageHtml.substring(
        exampleSectionStartIndex,
        exampleSectionEndIndex + exampleSectionEndString.length,
      );

      results.push(parseExampleSection(exampleSection));
    } else {
      break;
    }
  }

  return {
    query: phrase,
    found: results.length > 0,
    results,
    uri: uriForExampleSearch(phrase),
    phrase,
  };
}

/* EXAMPLE SEARCH FUNCTIONS END */

/*
 * This is a class because Jisho's admin indicated he would like to add
 * API tokens and rate limits someday. Since this is a class, clients will be
 * able to instantiate it with their API token, and won't need to make any
 * other changes, when/if API tokens are introduced.
 */
class API {
  constructor(requestOptions) {
    this.requestOptions = requestOptions;
  }

  // See comment above class definition for justification.
  // eslint-disable-next-line class-methods-use-this
  searchForPhrase(phrase, requestOptions) {
    return request({
      uri: JISHO_API,
      qs: {
        keyword: phrase,
      },
      json: true,
      ...this.requestOptions,
      ...requestOptions,
    });
  }

  // See comment above class definition for justification.
  // eslint-disable-next-line class-methods-use-this
  searchForKanji(kanji, requestOptions) {
    const uri = uriForKanjiSearch(kanji);
    return request({
      uri,
      json: false,
      ...this.requestOptions,
      ...requestOptions,
    }).then(pageHtml => parseKanjiPageData(pageHtml, kanji)).catch((err) => {
      // Seems to be a bug in Jisho that if you enter a URI encoded URI into the search,
      // it gives you a 404 instead of a regular search page with empty results.
      // So handle 404 the same way as empty results.
      if (err.message.indexOf('The page you were looking for doesn\'t exist') !== -1) {
        return parseKanjiPageData(err.message, kanji);
      }
      throw err;
    });
  }

  // See comment above class definition for justification.
  // eslint-disable-next-line class-methods-use-this
  searchForExamples(phrase, requestOptions) {
    const uri = uriForExampleSearch(phrase);
    return request({
      uri,
      json: false,
      ...this.requestOptions,
      ...requestOptions,
    }).then(pageHtml => parseExamplePageData(pageHtml, phrase));
  }
}

module.exports = API;
