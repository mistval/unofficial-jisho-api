/*
 * This module encapsulates the official Jisho.org API
 * and also provides kanji and example search features that scrape Jisho.org.
 * Permission to scrape granted by Jisho's admin Kimtaro:
 *     https://jisho.org/forum/54fefc1f6e73340b1f160000-is-there-any-kind-of-search-api
 */

import axiosBuilder from 'axios';
import cheerio from 'cheerio';
import escapeStringRegexp from 'escape-string-regexp';
import { XmlEntities } from 'html-entities';

const axios = axiosBuilder.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'unofficial-jisho-api (https://www.npmjs.com/package/unofficial-jisho-api)'
  },
});

const JISHO_API = 'https://jisho.org/api/v1/search/words';
const SCRAPE_BASE_URI = 'https://jisho.org/search/';

// This link does not use https because as of June 5, 2021 SSL is broken on classic.jisho.org
// (and even if it's been fixed since then, it will be safer to keep this as-is)
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

function uriForPhraseSearch(phrase,page) {
  let uri = `${JISHO_API}?keyword=${encodeURIComponent(phrase)}`;
  if(page) {
    uri = `${uri}&page=${page}`;
  }

  return uri;
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
      example: examplesLines[0],
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

  return parseAnchorsToArray(partsSection).sort();
}

function getSvgUri(pageHtml) {
  const svgRegex = /\/\/.*?.cloudfront.net\/.*?.svg/;
  const regexResult = svgRegex.exec(pageHtml);
  return regexResult ? `https:${regexResult[0]}` : undefined;
}

function getGifUri(kanji) {
  const unicodeString = kanji.codePointAt(0).toString(16);
  const fileName = `${unicodeString}.gif`;
  const animationUri = `https://raw.githubusercontent.com/mistval/kanji_images/master/gifs/${fileName}`;

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

const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf々]/g;

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

        const kanaEnding = [];
        for (let j = unlifted.length - 1; j > 0; j -= 1) {
          if (!unlifted[j].match(kanjiRegex)) {
            kanaEnding.push(unlifted[j]);
          } else {
            break;
          }
        }

        kana += kanaEnding.reverse().join('');
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

function normalizeSentenceElement(sentenceElement) {
  const sentenceHtml = sentenceElement.html()
  const normalizedSentenceHtml = sentenceHtml.replace(
    /(?<=<\/li>)\s*([^\s<>]+)\s*(?=<li)/g,
    (m, g1) => `<li class="clearfix"><span class="unlinked">${g1.trim()}</span></li>`
  ).replace(
    /\<\/li\>\s*([^<\s]+)\s*\<\/ul>/g,
    (m, g1) => `</li><li class="clearfix"><span class="unlinked">${g1.trim()}</span></li></ul>`
  ).replace(
    /<ul class="japanese_sentence japanese japanese_gothic clearfix" lang="ja">\s*([^<\s]+)\s*<li/g,
    (m, g1) => `<ul class="japanese_sentence japanese japanese_gothic clearfix" lang="ja"><li class="clearfix"><span class="unlinked">${g1.trim()}</span></li><li`
  );

  const result = cheerio.load(normalizedSentenceHtml);
  return result;
}

function getPieces(sentenceElement) {
  const pieceElements = normalizeSentenceElement(sentenceElement)('li.clearfix');
  const pieces = [];
  for (let pieceIndex = 0; pieceIndex < pieceElements.length; pieceIndex += 1) {
    const pieceElement = pieceElements.eq(pieceIndex);

    pieces.push({
      lifted: pieceElement.children('.furigana').text(),
      unlifted: pieceElement.children('.unlinked').text(),
    });
  }

  return pieces;
}

function parseExampleDiv(div) {
  const english = div.find('.english').text();
  const { kanji, kana } = getKanjiAndKana(div);

  return {
    english,
    kanji,
    kana,
    pieces: getPieces(div),
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

/* PHRASE SCRAPE FUNCTIONS START */

function getTags($) {
  const tags = [];

  const tagElements = $('.concept_light-tag');
  for (let i = 0; i < tagElements.length; i += 1) {
    const tagText = tagElements.eq(i).text();
    tags.push(tagText);
  }

  return tags;
}

function getMeaningsOtherFormsAndNotes($) {
  const returnValues = { otherForms: [], notes: [] };

  const meaningsWrapper = $('#page_container > div > div > article > div > div.concept_light-meanings.medium-9.columns > div');
  const meaningsChildren = meaningsWrapper.children();
  const meanings = [];

  let mostRecentWordTypes = [];
  for (let meaningIndex = 0; meaningIndex < meaningsChildren.length; meaningIndex += 1) {
    const child = meaningsChildren.eq(meaningIndex);
    if (child.hasClass('meaning-tags')) {
      mostRecentWordTypes = child.text().split(',').map(s => s.trim().toLowerCase());
    } else if (mostRecentWordTypes[0] === 'other forms') {
      returnValues.otherForms = child.text().split('、')
        .map(s => s.replace('【', '').replace('】', '').split(' '))
        .map(a => ({ kanji: a[0], kana: a[1] }));
    } else if (mostRecentWordTypes[0] === 'notes') {
      returnValues.notes = child.text().split('\n');
    } else {
      const meaning = child.find('.meaning-meaning').text();
      const meaningAbstract = child.find('.meaning-abstract')
        .find('a')
        .remove()
        .end()
        .text();

      const supplemental = child.find('.supplemental_info').text().split(',')
        .map(s => s.trim())
        .filter(s => s);

      const seeAlsoTerms = [];
      for (let i = supplemental.length - 1; i >= 0; i -= 1) {
        const supplementalEntry = supplemental[i];
        if (supplementalEntry.startsWith('See also')) {
          seeAlsoTerms.push(supplementalEntry.replace('See also ', ''));
          supplemental.splice(i, 1);
        }
      }

      const sentences = [];
      const sentenceElements = child.find('.sentences').children('.sentence');

      for (let sentenceIndex = 0; sentenceIndex < sentenceElements.length; sentenceIndex += 1) {
        const sentenceElement = sentenceElements.eq(sentenceIndex);

        const english = sentenceElement.find('.english').text();
        const pieces = getPieces(sentenceElement);

        const japanese = sentenceElement
          .find('.english').remove().end()
          .find('.furigana')
          .remove()
          .end()
          .text();

        sentences.push({ english, japanese, pieces });
      }

      meanings.push({
        seeAlsoTerms,
        sentences,
        definition: meaning,
        supplemental,
        definitionAbstract: meaningAbstract,
        tags: mostRecentWordTypes,
      });
    }
  }

  returnValues.meanings = meanings;

  return returnValues;
}

function getAudio($) {
  const audio = [];
  $('.concept_light-status')
    .find('audio > source')
    .each((_, element) => audio.push({
      uri: `https:${element.attribs.src}`,
      mimetype: element.attribs.type,
    }));
  return audio;
}

function uriForPhraseScrape(searchTerm) {
  return `https://jisho.org/word/${encodeURIComponent(searchTerm)}`;
}

function parsePhrasePageData(pageHtml, query) {
  const $ = cheerio.load(pageHtml);
  const { meanings, otherForms, notes } = getMeaningsOtherFormsAndNotes($);
  const audio = getAudio($);

  const result = {
    found: true,
    query,
    uri: uriForPhraseScrape(query),
    tags: getTags($),
    meanings,
    otherForms,
    audio,
    notes,
  };

  return result;
}

/* PHRASE SCRAPE FUNCTIONS END */

/**
 * @typedef {Object} PhraseScrapeSentence
 * @property {string} english The English meaning of the sentence.
 * @property {string} japanese The Japanese text of the sentence.
 * @property {Array.<ExampleSentencePiece>} pieces The lifted/unlifted pairs
 *   that make up the sentence. Lifted text is furigana, unlifted is the text below the furigana.
 */

/**
 * @typedef {Object} PhraseScrapeMeaning
 * @property {Array.<string>} seeAlsoTerms The words that Jisho lists as "see also".
 * @property {Array.<PhraseScrapeSentence>} sentences Example sentences for this meaning.
 * @property {string} definition The definition.
 * @property {Array.<string>} supplemental Supplemental information.
 *   For example "usually written using kana alone".
 * @property {string} definitionAbstract An "abstract" definition.
 *   Often this is a Wikipedia definition.
 * @property {Array.<string>} tags Tags associated with this meaning.
 */

/** @typedef {Object} PhraseScrapeJapaneseWord
 * @property {string} kanji The japanese word, written in kanji if available
 * @property {string} [kana] The corresponding kana spelling of the whole word, if kanji is present
 */

/** @typedef {Object} AudioFile
 * @property {string} uri The uri pointing to the audio file
 * @property {string} mimetype The mimetype of the audio file. Usually mp3 or ogg
 */

/**
 * @typedef {Object} PhrasePageScrapeResult
 * @property {boolean} found True if a result was found.
 * @property {string} query The term that you searched for.
 * @property {string} [uri] The URI that these results were scraped from, if a result was found.
 * @property {Array.<PhraseScrapeJapaneseWord>} [otherForms] Other forms of the search term, if a
 *   result was found.
 * @property {Array.<PhraseScrapeMeaning>} [meanings] Information about the meanings associated
 *   with result.
 * @property {Array.<string>} [tags] Tags associated with this search result.
 * @property {Array.<AudioFile>} [audio] Recordings of the word, in different file formats if
 *   present
 * @property {Array.<string>} [notes] Notes associated with the search result.
 */

/**
 * @typedef {Object} YomiExample
 * @property {string} example The original text of the example.
 * @property {string} reading The reading of the example.
 * @property {string} meaning The meaning of the example.
 */

/**
 * @typedef {Object} KanjiResult
 * @property {boolean} found True if results were found.
 * @property {string} query The term that you searched for.
 * @property {string} [taughtIn] The school level that the kanji is taught in, if applicable.
 * @property {string} [jlptLevel] The lowest JLPT exam that this kanji is likely to
 *   appear in, if applicable. 'N5' or 'N4' or 'N3' or 'N2' or 'N1'.
 * @property {number} [newspaperFrequencyRank] A number representing this kanji's frequency rank
 *   in newspapers, if applicable.
 * @property {number} [strokeCount] How many strokes this kanji is typically drawn in,
 *   if applicable.
 * @property {string} [meaning] The meaning of the kanji, if applicable.
 * @property {Array.<string>} [kunyomi] This character's kunyomi, if applicable.
 * @property {Array.<YomiExample>} [kunyomiExamples] Examples of this character's kunyomi
 *   being used, if applicable.
 * @property {string} [onyomi] This character's onyomi, if applicable.
 * @property {Array.<YomiExample>} [onyomiExamples] Examples of this character's onyomi
 *   being used, if applicable.
 * @property {Object} [radical] Information about this character's radical, if applicable.
 * @property {string} [radical.symbol] The radical symbol, if applicable.
 * @property {Array.<string>} [radical.forms] The radical forms used in this kanji, if applicable.
 * @property {string} [radical.meaning] The meaning of the radical, if applicable.
 * @property {Array.<string>} [parts] The parts used in this kanji, if applicable.
 * @property {string} [strokeOrderDiagramUri] The URL to a diagram showing how to draw this kanji
 *   step by step, if applicable.
 * @property {string} [strokeOrderSvgUri] The URL to an SVG describing how to draw this kanji,
 *   if applicable.
 * @property {string} [strokeOrderGifUri] The URL to a gif showing the kanji being draw and its
 *   stroke order, if applicable.
 * @property {string} [uri] The URI that these results were scraped from, if applicable.
 */

/**
 * @typedef {Object} ExampleSentencePiece
 * @property {string} unlifted Baseline text shown on Jisho.org (below the lifted text / furigana)
 * @property {string} lifted Furigana text shown on Jisho.org (above the unlifted text)
 */

/**
 * @typedef {Object} ExampleResultData
 * @property {string} kanji The example sentence including kanji.
 * @property {string} kana The example sentence without kanji (only kana). Sometimes this may
 *   include some Kanji, as furigana is not always available from Jisho.org.
 * @property {string} english An English translation of the example.
 * @property {Array.<ExampleSentencePiece>} pieces The lifted/unlifted pairs
 *   that make up the sentence. Lifted text is furigana, unlifted is the text below the furigana.
 */

/**
 * @typedef {Object} ExampleResults
 * @property {string} query The term that you searched for.
 * @property {boolean} found True if results were found.
 * @property {string} uri The URI that these results were scraped from.
 * @property {Array.<ExampleResultData>} results The examples that were found, if any.
 */

/**
 * A wrapper around the Jisho search functions.
 */
class API {
  /**
   * Query the official Jisho API for a word or phrase. See
   * [here]{@link https://jisho.org/forum/54fefc1f6e73340b1f160000-is-there-any-kind-of-search-api}
   * for discussion about the official API.
   * @param {string} phrase The search term to search for.
   * @returns {Object} The response data from the official Jisho.org API. Its format is somewhat
   *   complex and is not documented, so put on your trial-and-error hat.
   * @async
   */
  searchForPhrase(phrase, page) {
    const uri = uriForPhraseSearch(phrase, page);
    return axios.get(uri).then(response => response.data);
  }

  /**
   * Scrape the word page for a word/phrase. This allows you to
   * get some information that isn't provided by the official API, such as
   * part-of-speech and JLPT level. However, the official API should be preferred
   * if it has the information you need. This function scrapes https://jisho.org/word/XXX.
   * In general, you'll want to include kanji in your search term, for example 掛かる
   * instead of かかる (no results).
   * @param {string} phrase The search term to search for.
   * @returns {PhrasePageScrapeResult} Information about the searched query.
   * @async
   */
  async scrapeForPhrase(phrase) {
    const uri = uriForPhraseScrape(phrase);
    try {
      const response = await axios.get(uri);
      return parsePhrasePageData(response.data, phrase);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return {
          query: phrase,
          found: false,
        };
      }

      throw err;
    }
  }

  /**
   * Scrape Jisho.org for information about a kanji character.
   * @param {string} kanji The kanji to search for.
   * @returns {KanjiResult} Information about the searched kanji.
   * @async
   */
  searchForKanji(kanji) {
    const uri = uriForKanjiSearch(kanji);
    return axios.get(uri).then(response => parseKanjiPageData(response.data, kanji));
  }

  /**
   * Scrape Jisho.org for examples.
   * @param {string} phrase The word or phrase to search for.
   * @returns {ExampleResults}
   * @async
   */
  searchForExamples(phrase) {
    const uri = uriForExampleSearch(phrase);
    return axios.get(uri).then(response => parseExamplePageData(response.data, phrase));
  }
}

API.prototype.getUriForKanjiSearch = uriForKanjiSearch;
API.prototype.getUriForExampleSearch = uriForExampleSearch;
API.prototype.getUriForPhraseSearch = uriForPhraseSearch;
API.prototype.getUriForPhraseScrape = uriForPhraseScrape;
API.prototype.parseExamplePageHtml = parseExamplePageData;
API.prototype.parseKanjiPageHtml = parseKanjiPageData;
API.prototype.parsePhraseScrapeHtml = parsePhrasePageData;

export default API;
