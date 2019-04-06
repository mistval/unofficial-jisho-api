// Type definitions for The Unofficial Jisho API 
// Project: The Unofficial Jisho API
// Definitions by: Damien McMahon https://macoto.co.uk 

import { Options } from 'request';

interface Radical {
  symbol: string;
  meaning: string;
}

interface YomiExample {
  example: string;
  reading: string;
  meaning: string;
}

interface Piece {
  lifted: string;
  unlifted: string;
}

interface Result {
  english: string;
  kanji: string;
  kana: string;
  pieces: Piece[];
}

interface QueryResult {
  query: string;
  found: boolean;
  uri: string;
}

export interface ExampleParseResult extends QueryResult {
  results: Result[];
  phrase: string;
}

export interface KanjiParseResult extends QueryResult {
  taughtIn: string;
  jlptLevel: string;
  newspaperFrequencyRank: string;
  strokeCount: string;
  meaning: string;
  kunyomi: string[];
  onyomi: string[];
  onyomiExamples: YomiExample[];
  kunyomiExamples: YomiExample[];
  radical: Radical; 
  parts: string[]; 
  strokeOrderDiagramUri: string;
  strokeOrderSvgUri: string;
  strokeOrderGifUri: string;
}

export interface ScrapeParseResult extends Result {
  tags: string[];
  meanings: string[];
  otherForms: string[];
}

export interface JishoJapaneseWord {
  word: string;
  reading: string;
}

export interface JishoSenseLink {
  text: string;
  url: string;
}

export interface JishoWordSense {
  english_definitions: string[];
  parts_of_speech: string[];
  links: JishoSenseLink[];
  tags: string[];
  see_also: string[];
  antonyms: string[];
  source: any[];
  info: string[];
  restrictions: any[];
}

export interface JishoAttribution {
  jmdict: boolean;
  jmnedict: boolean;
  dbpedia: boolean;
}

export interface JishoResult {
  slug: string;
  is_common: boolean;
  tags: string[];
  jlpt: string[];
  japanese: JishoJapaneseWord[];
  senses: JishoWordSense[];
  attribution: JishoAttribution;
}

export interface JishoAPIResult {
  meta: {
    status: number
  };
  
  data: JishoResult[];
}

declare class jishoAPI {

  constructor ();

  getUriForExampleSearch(phrase: string): string;
  getUriForKanjiSearch(kanji:string): string;
  getUriForPhraseScrape(searchTerm: string): string;
  getUriForPhraseSearch(phrase: string): string;

  parseExamplePageHtml(pageHtml: HTMLElement, phrase:string): ExampleParseResult;
  parseKanjiPageData(pageHtml: HTMLElement, kanji: string): KanjiParseResult;
  parseKanjiPageHtml(pageHtml: HTMLElement, kanji: string): KanjiParseResult;
  parsePhraseScrapeHtml(pageHtml: HTMLElement, query: string): ScrapeParseResult;

  scrapeForPhrase(phrase: string, requestOptions?: Options): Promise<ScrapeParseResult>
  searchForExamples(phrase: string, requestOptions?: Options): Promise<ExampleParseResult>
  searchForKanji(phrase: string, requestOptions?: Options): Promise<KanjiParseResult>; 
  searchForPhrase(phrase: string, requestOptions?: Options): Promise<JishoAPIResult>
}

export default jishoAPI;
