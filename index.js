'use strict'
const request = require('request-promise');
const htmlEntities = new (require('html-entities').XmlEntities)();
const htmlparser = require('htmlparser');

const JISHO_API = 'http://jisho.org/api/v1/search/words';
const SCRAPE_BASE_URI = 'http://jisho.org/search/';
const STROKE_ORDER_DIAGRAM_BASE_URI = 'http://classic.jisho.org/static/images/stroke_diagrams/';

/* KANJI SEARCH FUNCTIONS START */

const ONYOMI_LOCATOR_SYMBOL = 'On';
const KUNYOMI_LOCATOR_SYMBOL = 'Kun';

function superTrim(str) {
  if (!str) {
    return;
  }
  str = str.replace(/(?:\r\n|\r|\n)/g, '');
  str = str.trim();
  return str;
}

function uriForKanjiSearch(kanji) {
  return SCRAPE_BASE_URI + encodeURIComponent(kanji) + '%23kanji';
}

function getUriForStrokeOrderDiagram(kanji) {
  return STROKE_ORDER_DIAGRAM_BASE_URI + kanji.charCodeAt(0).toString() + '_frames.png';
}

function containsKanjiGlyph(pageHtml, kanji) {
  let kanjiGlyphToken = '<h1 class=\"character\" data-area-name=\"print\" lang=\"ja\">' + kanji + '</h1>';
  return pageHtml.indexOf(kanjiGlyphToken) !== -1;
}

function getStringBetweenIndicies(data, startIndex, endIndex) {
  let result = data.substring(startIndex, endIndex);
  return superTrim(result);
}

function getStringBetweenStrings(data, startString, endString) {
  let startStringLocation = data.indexOf(startString);
  if (startStringLocation === -1) {
    return;
  }
  let startIndex = startStringLocation + startString.length;
  let endIndex = data.indexOf(endString, startIndex);
  if (endIndex >= 0) {
    return getStringBetweenIndicies(data, startIndex, endIndex);
  }
}

function getStringBetweenStringsReverse(data, startString, endString) {
  let endStringLocation = data.indexOf(endString);
  let startStringLocation = data.indexOf(startString);

  if (startStringLocation === -1 || endStringLocation === -1) {
    return;
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
  let stringBetweenStrings = getStringBetweenStrings(pageHtml, startString, endString);
  if (stringBetweenStrings) {
    return parseInt(stringBetweenStrings);
  }
}

function parseAnchorsToArray(str) {
  const closeAnchor = '</a>';
  let rest = str;
  let results = [];

  while (rest.indexOf('<') !== -1) {
    let result = getStringBetweenStrings(rest, '>', '<');
    results.push(result);
    rest = rest.substring(rest.indexOf(closeAnchor) + closeAnchor.length);
  }

  return results;
}

function getYomi(pageHtml, yomiLocatorSymbol) {
  let yomiSection = getStringBetweenStrings(pageHtml, `<dt>${yomiLocatorSymbol}:</dt>`, '</dl>');
  if (yomiSection) {
    let yomiString = getStringBetweenStrings(yomiSection, '<dd class=\"kanji-details__main-readings-list\" lang=\"ja\">', '</dd>');
    if (yomiString) {
      let readings = parseAnchorsToArray(yomiString);
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

function getOnyomiExamples(pageHtml) {
  return getYomiExamples(pageHtml, ONYOMI_LOCATOR_SYMBOL);
}

function getKunyomiExamples(pageHtml) {
  return getYomiExamples(pageHtml, KUNYOMI_LOCATOR_SYMBOL);
}

function getYomiExamples(pageHtml, yomiLocatorSymbol) {
  let locatorString = `<h2>${yomiLocatorSymbol} reading compounds</h2>`;
  let exampleSectionStartIndex = pageHtml.indexOf(locatorString);
  let exampleSectionEndIndex = pageHtml.indexOf('</ul>', exampleSectionStartIndex);
  if (exampleSectionStartIndex === -1 || exampleSectionEndIndex === -1) {
    return [];
  }

  let exampleSection = pageHtml.substring(exampleSectionStartIndex, exampleSectionEndIndex);
  exampleSection = exampleSection.replace(locatorString, '');
  exampleSection = exampleSection.replace('<ul class=\"no-bullet\">', '');

  let examplesLines = exampleSection.split('\n');
  examplesLines = examplesLines.map(line => superTrim(line));
  while (examplesLines[0] !== '<li>') {
    examplesLines.shift();
  }
  while (examplesLines[examplesLines.length - 1] !== '</li>') {
    examplesLines.pop();
  }

  let examples = [];
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
    ++exampleIndex;
  }

  return examples;
}

function getRadical(pageHtml) {
  const radicalMeaningStartString = '<span class="radical_meaning">';
  const radicalMeaningEndString = '</span>';
  let radicalMeaning = getStringBetweenStrings(pageHtml, radicalMeaningStartString, radicalMeaningEndString);

  if (radicalMeaning) {
    let radicalMeaningStartIndex = pageHtml.indexOf(radicalMeaningStartString);
    let radicalMeaningEndIndex = pageHtml.indexOf(radicalMeaningEndString, radicalMeaningStartIndex);
    let radicalSymbolStartIndex = radicalMeaningEndIndex + radicalMeaningEndString.length;
    const radicalSymbolEndString = '</span>';
    let radicalSymbolEndIndex = pageHtml.indexOf(radicalSymbolEndString, radicalSymbolStartIndex);
    let radicalSymbol = getStringBetweenIndicies(pageHtml, radicalSymbolStartIndex, radicalSymbolEndIndex);
    let radicalForms;
    if (radicalSymbol.length > 1) {
      radicalForms = radicalSymbol.substring(1).replace('(', '').replace(')', '').trim().split(', ');
      radicalSymbol = radicalSymbol[0];
    }
    return {symbol: radicalSymbol, forms: radicalForms, meaning: radicalMeaning};
  }
}

function getParts(pageHtml) {
  const partsSectionStartString = '<dt>Parts:</dt>';
  const partsSectionEndString = '</dl>';
  let partsSection = getStringBetweenStrings(pageHtml, partsSectionStartString, partsSectionEndString);
  partsSection = partsSection.replace('<dd>', '').replace('</dd>', '');
  return parseAnchorsToArray(partsSection);
}

function parseKanjiPageData(pageHtml, kanji) {
  let result = {};
  result.query = kanji;
  result.found = containsKanjiGlyph(pageHtml, kanji);
  if (!result.found) {
    return result;
  }

  result.taughtIn = getStringBetweenStrings(pageHtml, 'taught in <strong>', '</strong>');
  result.jlptLevel = getStringBetweenStrings(pageHtml, 'JLPT level <strong>', '</strong>');
  result.newspaperFrequencyRank = getStringBetweenStringsReverse(pageHtml, '<strong>', '</strong> of 2500 most used kanji in newspapers');
  result.strokeCount = getIntBetweenStrings(pageHtml, '<strong>', '</strong> strokes');
  result.meaning = htmlEntities.decode(superTrim(getStringBetweenStrings(pageHtml, '<div class=\"kanji-details__main-meanings\">', '</div>')));
  result.kunyomi = getKunyomi(pageHtml);
  result.onyomi = getOnyomi(pageHtml);
  result.onyomiExamples = getOnyomiExamples(pageHtml);
  result.kunyomiExamples = getKunyomiExamples(pageHtml);
  result.radical = getRadical(pageHtml);
  result.parts = getParts(pageHtml);
  result.strokeOrderDiagramUri = getUriForStrokeOrderDiagram(kanji);
  result.uri = uriForKanjiSearch(kanji);
  return result;
}

/* KANJI SEARCH FUNCTIONS END */

/* EXAMPLE SEARCH FUNCTIONS START */

const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf]/g;

function uriForExampleSearch(phrase) {
  return SCRAPE_BASE_URI + encodeURIComponent(phrase) + '%23sentences';
}

function parseKanjiLine(japaneseSectionDom) {
  let result = [];
  for (let i = 0; i < japaneseSectionDom.length - 1; ++i) {
    let kanjiFuriganaPair = japaneseSectionDom[i].children;
    if (kanjiFuriganaPair) {
      result.push(kanjiFuriganaPair[kanjiFuriganaPair.length - 1].children[0].raw);
    } else {
      let kanji = japaneseSectionDom[i].raw.replace(/\\n/g, '').trim();
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
  let result = [];
  for (let i = 0; i < japaneseSectionDom.length - 1; ++i) {
    let kanjiFuriganaPair = japaneseSectionDom[i].children;
    if (kanjiFuriganaPair && kanjiFuriganaPair[0].children) {
      let kana = kanjiFuriganaPair[0].children[0].raw;
      let kanji = parsedKanjiLine[i];
      let kanjiRegexMatches = kanji.match(kanjiRegex);
      if (kanji.startsWith(kana)) {
        result.push(kanji);
      } else if (kanjiRegexMatches) {
        let lastMatch = kanjiRegexMatches[kanjiRegexMatches.length - 1];
        let lastMatchIndex = kanji.lastIndexOf(lastMatch);
        let nonFuriPart = kanji.substring(lastMatchIndex + 1);
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
  const englishSectionStartString = '<span class=\"english\">';
  const englishSectionEndString = '</span';
  let englishSectionStartIndex = exampleSectionHtml.indexOf(englishSectionStartString);
  let englishSectionEndIndex = exampleSectionHtml.indexOf(englishSectionEndString, englishSectionStartIndex);
  return exampleSectionHtml.substring(englishSectionStartIndex + englishSectionStartString.length, englishSectionEndIndex);
}

function addKanjiAndKana(exampleSectionHtml, intermediaryResult) {
  const japaneseSectionStartString = '<ul class=\"japanese_sentence japanese japanese_gothic clearfix\" lang=\"ja\">';
  const japaneseSectionEndString = '</ul>';
  let japaneseSectionStartIndex = exampleSectionHtml.indexOf(japaneseSectionStartString) + japaneseSectionStartString.length;
  let japaneseSectionEndIndex = exampleSectionHtml.indexOf(japaneseSectionEndString);
  let japaneseSectionText = exampleSectionHtml.substring(japaneseSectionStartIndex, japaneseSectionEndIndex);
  let parseHandler = new htmlparser.DefaultHandler(function(error, dom) {});
  let parser = new htmlparser.Parser(parseHandler);
  parser.parseComplete(japaneseSectionText);
  let japaneseDom = parseHandler.dom;

  let parsedKanjiLine = parseKanjiLine(japaneseDom);
  intermediaryResult.kanji = parsedKanjiLine.join('');
  intermediaryResult.kana = parseKanaLine(japaneseDom, parsedKanjiLine).join('');
  return intermediaryResult;
}

function parseExampleSection(exampleSectionHtml) {
  let result = {};
  result.english = getExampleEnglish(exampleSectionHtml);
  return addKanjiAndKana(exampleSectionHtml, result);
}

function parseExamplePageData(pageHtml, phrase) {
  let results = [];
  const exampleSectionStartString = '<ul class=\"japanese_sentence japanese japanese_gothic clearfix\" lang=\"ja\">';
  const exampleSectionEndString = '<span class=\"inline_copyright\">';
  let exampleSectionStartIndex = 0;
  while (true) {
    // +1 to move to the next instance of sectionStartString. Otherwise we'd infinite loop finding the same one over and over.
    exampleSectionStartIndex = pageHtml.indexOf(exampleSectionStartString, exampleSectionStartIndex) + 1;
    let exampleSectionEndIndex = pageHtml.indexOf(exampleSectionEndString, exampleSectionStartIndex);
    if (exampleSectionStartIndex !== 0 && exampleSectionEndIndex !== -1) {
      let exampleSection = pageHtml.substring(exampleSectionStartIndex, exampleSectionEndIndex + exampleSectionEndString.length);
      results.push(parseExampleSection(exampleSection));
    } else {
      break;
    }
  }

  return {
    query: phrase,
    found: results.length > 0,
    results: results,
    uri: uriForExampleSearch(phrase),
    phrase: phrase,
  }
}

/* EXAMPLE SEARCH FUNCTIONS END */

class API {
  searchForPhrase(phrase, timeout) {
    timeout = timeout || 10000;
    return request({
      uri: JISHO_API,
      qs: {
        keyword: phrase,
      },
      json: true,
      timeout: timeout
    });
  }

  searchForKanji(kanji, timeout) {
    timeout = timeout || 10000;
    let uri = uriForKanjiSearch(kanji);
    return request({
      uri: uri,
      json: false,
      timeout: timeout,
    }).then(pageHtml => {
      return parseKanjiPageData(pageHtml, kanji);
    }).catch((err) => {
      // Seems to be a bug in Jisho that if you enter a URI encoded URI into the search,
      // it gives you a 404 instead of a regular search page with empty results.
      // So handle 404 the same way as empty results.
      if (err.message.indexOf('The page you were looking for doesn\'t exist') !== -1) {
        return parseKanjiPageData(err.message, kanji);
      } else {
        throw err;
      }
    });
  }

  searchForExamples(phrase, timeout) {
    timeout = timeout || 10000;
    let uri = uriForExampleSearch(phrase);
    return request({
      uri: uri,
      json: false,
      timeout: timeout
    }).then(pageHtml => {
      return parseExamplePageData(pageHtml, phrase);
    });
  }
}

module.exports = API;
