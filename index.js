/*
 * This module encapsulates the official Jisho.org API
 * and also provides kanji and example search features that scrape Jisho.org.
 * Permission to scrape granted by Jisho's admin Kimtaro:
 *     http://jisho.org/forum/54fefc1f6e73340b1f160000-is-there-any-kind-of-search-api
 */

const request = require('request-promise');
const cheerio = require('cheerio');
const escapeStringRegexp = require('escape-string-regexp');
const { XmlEntities } = require('html-entities');

const JISHO_API = 'http://jisho.org/api/v1/search/words';
const SCRAPE_BASE_URI = 'http://jisho.org/search/';
const STROKE_ORDER_DIAGRAM_BASE_URI = 'http://classic.jisho.org/static/images/stroke_diagrams/';

const htmlEntities = new XmlEntities();

/* KANJI SEARCH FUNCTIONS START */

const ONYOMI_LOCATOR_SYMBOL = 'On';
const KUNYOMI_LOCATOR_SYMBOL = 'Kun';

function removeNewlines(str) {
  return str.replace(/(?:\r|\n)/g, '').trim();
}

function uriForKanjiSearch(kanji) {
  return `${SCRAPE_BASE_URI}${encodeURIComponent(kanji)}%23kanji`;
}

function getUriForStrokeOrderDiagram(kanji) {
  return `${STROKE_ORDER_DIAGRAM_BASE_URI}${kanji.charCodeAt(0).toString()}_frames.png`;
}

function uriForPhraseSearch(phrase) {
  return `${JISHO_API}?keyword=${phrase}`;
}

function containsKanjiGlyph(pageHtml, kanji) {
  const kanjiGlyphToken = `<h1 class="character" data-area-name="print" lang="ja">${kanji}</h1>`;
  return pageHtml.indexOf(kanjiGlyphToken) !== -1;
}

function getStringBetweenIndicies(data, startIndex, endIndex) {
  const result = data.substring(startIndex, endIndex);
  return removeNewlines(result).trim();
}

function getStringBetweenStrings(data, startString, endString) {
  const regex = new RegExp(`${escapeStringRegexp(startString)}(.*?)${escapeStringRegexp(endString)}`, 's');
  const match = data.match(regex);

  return match ? match[1] : undefined;
}

function getIntBetweenStrings(pageHtml, startString, endString) {
  const stringBetweenStrings = getStringBetweenStrings(pageHtml, startString, endString);
  if (stringBetweenStrings) {
    return parseInt(stringBetweenStrings, 10);
  }

  return undefined;
}

function getAllGlobalGroupMatches(str, regex) {
  let regexResult = regex.exec(str);
  const results = [];
  while (regexResult) {
    results.push(regexResult[1]);
    regexResult = regex.exec(str);
  }

  return results;
}

function parseAnchorsToArray(str) {
  const regex = /<a href=".*?">(.*?)<\/a>/g;
  return getAllGlobalGroupMatches(str, regex);
}

function getYomi(pageHtml, yomiLocatorSymbol) {
  const yomiSection = getStringBetweenStrings(pageHtml, `<dt>${yomiLocatorSymbol}:</dt>`, '</dl>');
  return parseAnchorsToArray(yomiSection || '');
}

function getKunyomi(pageHtml) {
  return getYomi(pageHtml, KUNYOMI_LOCATOR_SYMBOL);
}

function getOnyomi(pageHtml) {
  return getYomi(pageHtml, ONYOMI_LOCATOR_SYMBOL);
}

function getYomiExamples(pageHtml, yomiLocatorSymbol) {
  const locatorString = `<h2>${yomiLocatorSymbol} reading compounds</h2>`;
  const exampleSection = getStringBetweenStrings(pageHtml, locatorString, '</ul>');
  if (!exampleSection) {
    return [];
  }

  const regex = /<li>(.*?)<\/li>/gs;
  const regexResults = getAllGlobalGroupMatches(exampleSection, regex).map(s => s.trim());

  const examples = regexResults.map((regexResult) => {
    const examplesLines = regexResult.split('\n').map(s => s.trim());
    return {
      examples: examplesLines[0],
      reading: examplesLines[1].replace('【', '').replace('】', ''),
      meaning: htmlEntities.decode(examplesLines[2]),
    };
  });

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
  ).trim();

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

  const partsSection = getStringBetweenStrings(
    pageHtml,
    partsSectionStartString,
    partsSectionEndString,
  );

  return parseAnchorsToArray(partsSection);
}

function getSvgUri(pageHtml) {
  const svgRegex = /\/\/.*?.cloudfront.net\/.*?.svg/;
  const regexResult = svgRegex.exec(pageHtml);
  return regexResult ? `http:${regexResult[0]}` : undefined;
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

function getNewspaperFrequencyRank(pageHtml) {
  const frequencySection = getStringBetweenStrings(pageHtml, '<div class="frequency">', '</div>');
  return frequencySection ? getStringBetweenStrings(frequencySection, '<strong>', '</strong>') : undefined;
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
  result.newspaperFrequencyRank = getNewspaperFrequencyRank(pageHtml);
  result.strokeCount = getIntBetweenStrings(pageHtml, '<strong>', '</strong> strokes');
  result.meaning = htmlEntities.decode(removeNewlines(getStringBetweenStrings(pageHtml, '<div class="kanji-details__main-meanings">', '</div>')).trim());
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

function getKanjiAndKana(div) {
  const ul = div.find('ul').eq(0);
  const contents = ul.contents();

  let kanji = '';
  let kana = '';
  for (let i = 0; i < contents.length; i += 1) {
    const content = contents.eq(i);
    if (content[0].name === 'li') {
      const li = content;
      const furigana = li.find('.furigana').text();
      const unlifted = li.find('.unlinked').text();

      if (furigana) {
        kanji += unlifted;
        kana += furigana;

        for (let j = 0; j < unlifted.length; j += 1) {
          if (!unlifted[j].match(kanjiRegex)) {
            kana += unlifted[j];
          }
        }
      } else {
        kanji += unlifted;
        kana += unlifted;
      }
    } else {
      const text = content.text().trim();
      if (text) {
        kanji += text;
        kana += text;
      }
    }
  }

  return { kanji, kana };
}

function parseExampleDiv(div) {
  const english = div.find('.english').text();
  const { kanji, kana } = getKanjiAndKana(div);

  return {
    english,
    kanji,
    kana,
  };
}

function parseExamplePageData(pageHtml, phrase) {
  const $ = cheerio.load(pageHtml);
  const divs = $('.sentence_content');

  const results = [];
  for (let i = 0; i < divs.length; i += 1) {
    const div = divs.eq(i);
    results.push(parseExampleDiv(div));
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

API.prototype.getUriForKanjiSearch = uriForKanjiSearch;
API.prototype.getUriForExampleSearch = uriForExampleSearch;
API.prototype.getUriForPhraseSearch = uriForPhraseSearch;
API.prototype.parseExamplePageHtml = parseExamplePageData;
API.prototype.parseKanjiPageHtml = parseKanjiPageData;

module.exports = API;
