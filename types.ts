export interface ParsedLine {
  id: number;
  originalContent: string;
  isTranslatable: boolean;
  prefix: string; // The part before the first text
  text: string;   // The first text to translate (for backward compatibility)
  suffix: string; // The part after the last text
  csvRow?: string[]; // The parsed CSV row if applicable
  embeddedCsv?: { data: string[][]; targetColumn: number; headerRowIndex?: number };
  parts?: { isTranslatable: boolean, text: string }[]; // All parts including technical and translatable
  ue5Path?: string; // The JSON path for UE5 property
}

export interface CsvConfig {
  delimiter: string;
  quoteChar: string;
  targetColumn: number;
  escapeChar: string;
  allowMultiLine: boolean;
  headerRowIndex?: number;
  isUnityTextAssetFormat?: boolean;
}

export interface UnityConfig {
  targetLanguageIndex: number;
}

export interface Ue5Config {
  targetLang: string;
}

export interface ProjectMap {
  fileName: string;
  lines: ParsedLine[];
  timestamp: number;
  gameName?: string;
  regexPattern?: string;
  encoding?: string;
  csvConfig?: CsvConfig;
  unityConfig?: UnityConfig;
  ue5Config?: Ue5Config;
  ue5Data?: any;
}
