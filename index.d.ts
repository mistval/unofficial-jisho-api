// Type definitions for The Unofficial Jisho API 
// Project: The Unofficial Jisho API
// Definitions by: Damien McMahon https://macoto.co.uk 

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

interface MeaningAndForms {
  meanings: string[];
  otherForms: string[];
}

interface ExampleParseResult extends QueryResult {
  results: Result[];
  phrase: string;
}

interface KanjiParseResult extends QueryResult {
  taughtIn: string;
  jlptlevel: string;
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

interface ScrapeParseResult extends Result {
  tags: string[];
  meanings: string[];
  otherForms: string[];
}

declare class jishoAPI {

  constructor ();

  getUriForKanjiSearch(kanji:string): string;
  getUriForExampleSearch(phrase: string): string;
  getUriForPhraseSearch(phrase: string): string;
  getUriForPhraseScrape(searchTerm: string): string;

  parseExamplePageHtml(pageHtml: HTMLElement, phrase:string): ExampleParseResult;
  parseKanjiPageHtml(pageHtml: HTMLElement, kanji: string): KanjiParseResult;
  parsePhraseScrapeHtml(pageHtml: HTMLElement, query: string): ScrapeParseResult;
}

export = jishoAPI;
