// Type definitions for The Unofficial Jisho API 
// Project: The Unofficial Jisho API
// Definitions by: Damien McMahon https://macoto.co.uk 

export interface Radical {
  symbol: string;
  meaning: string;
}

export interface YomiExample {
  example: string;
  reading: string;
  meaning: string;
}

export interface Piece {
  lifted: string;
  unlifted: string;
}

export interface Result {
  english: string;
  kanji: string;
  kana: string;
  pieces: Piece[];
}

export interface QueryResult {
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

export interface PhraseScrapeSentence {
  english: string;
  japanese: string;
  pieces: Piece[];
}

export interface PhaseScrapeMeaning {
  seeAlsoTerms: string[];
  definition: string;
  supplemental: string[];
  definitionAbstract: string;
  tags: string[];
  sentences: PhraseScrapeSentence[];
}

export interface PhraseScrapeJapaneseWord {
  kanji: string;
  kana: string;
}

export interface AudioFile {
  uri: string;
  mimetype: string;
}

export interface ScrapeParseResult extends QueryResult {
  tags: string[];
  meanings: PhaseScrapeMeaning[];
  otherForms: PhraseScrapeJapaneseWord[];
  audio: AudioFile[];
  notes: string[];
}

export interface JishoJapaneseWord {
  word: string;
  reading: string;
}

export interface JishoSenseLink {
  text: string;
  url: string;
}

export interface JishoWordSource {
  language: string;
  word: string;
}

export interface JishoWordSense {
  english_definitions: string[];
  parts_of_speech: string[];
  links: JishoSenseLink[];
  tags: string[];
  see_also: string[];
  antonyms: string[];
  source: JishoWordSource[];
  info: string[];
  restrictions: string[];
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

declare class JishoAPI {

  constructor ();

  getUriForExampleSearch(phrase: string): string;
  getUriForKanjiSearch(kanji:string): string;
  getUriForPhraseScrape(searchTerm: string): string;
  getUriForPhraseSearch(phrase: string): string;

  parseExamplePageHtml(pageHtml: string, phrase: string): ExampleParseResult;
  parseKanjiPageHtml(pageHtml: string, kanji: string): KanjiParseResult;
  parsePhraseScrapeHtml(pageHtml: string, query: string): ScrapeParseResult;

  scrapeForPhrase(phrase: string): Promise<ScrapeParseResult>
  searchForExamples(phrase: string): Promise<ExampleParseResult>
  searchForKanji(kanji: string): Promise<KanjiParseResult>; 
  searchForPhrase(phrase: string): Promise<JishoAPIResult>
}

export default JishoAPI;
