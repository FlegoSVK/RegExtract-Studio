import Papa from 'papaparse';
import { ParsedLine, ProjectMap, CsvConfig, Ue5Config } from '../types';

// Logic for dynamic localization file parsing
// Pattern is provided by the user or the analyzer

export const parseFileContent = (content: string, fileName: string, regexPattern: string): ProjectMap => {
  if (regexPattern.startsWith('UE5_CONFIG:')) {
    try {
      const configStr = regexPattern.substring('UE5_CONFIG:'.length).trim();
      const ue5Config: Ue5Config = JSON.parse(configStr);
      
      const ue5Data = JSON.parse(content);
      const parsedLines: ParsedLine[] = [];
      let lineCounter = 0;

      const traverse = (node: any, path: string[]) => {
        if (!node || typeof node !== 'object') return;
        
        if (Array.isArray(node)) {
          node.forEach((child, index) => traverse(child, [...path, index.toString()]));
        } else {
          // Check if this node is a TextPropertyData for the target language
          if (node.$type && typeof node.$type === 'string' && node.$type.includes("TextPropertyData") && node.Name === ue5Config.targetLang) {
            let text = "";
            let textKey = "";
            if (typeof node.CultureInvariantString === 'string') {
              text = node.CultureInvariantString;
              textKey = "CultureInvariantString";
            } else if (typeof node.LocalizedString === 'string') {
              text = node.LocalizedString;
              textKey = "LocalizedString";
            } else if (typeof node.SourceString === 'string') {
              text = node.SourceString;
              textKey = "SourceString";
            }

            if (text) {
              parsedLines.push({
                id: lineCounter++,
                originalContent: text, // Keeping text as original content for the diff UI
                isTranslatable: true,
                prefix: '',
                text: text,
                suffix: '',
                ue5Path: [...path, textKey].join('.')
              });
            }
          }
          // Continue traversal for child properties
          for (const key in node) {
            if (key !== '$type' && key !== 'Name') { // Optimization to avoid unnecessary deep traversal of primitive properties
               traverse(node[key], [...path, key]);
            }
          }
        }
      };
      
      traverse(ue5Data, []);

      return {
        fileName,
        lines: parsedLines,
        timestamp: Date.now(),
        regexPattern,
        ue5Config,
        ue5Data
      };
    } catch (e) {
      console.error("Failed to parse UE5 config or content:", e);
    }
  }

  if (regexPattern.startsWith('UNITY_CONFIG:')) {
    try {
      const configStr = regexPattern.substring('UNITY_CONFIG:'.length).trim();
      const unityConfig = JSON.parse(configStr);
      
      const rawLines = content.split(/\r?\n/);
      const parsedLines: ParsedLine[] = [];
      
      let inTermData = false;
      let inLanguages = false;
      let inLanguageIndex = -1;
      
      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        
        if (line.match(/^\s*0 TermData data/)) {
          inTermData = true;
          inLanguages = false;
        }
        
        if (inTermData && line.match(/^\s*0 string Languages\s*$/)) {
          inLanguages = true;
          inLanguageIndex = -1;
        }

        if (inLanguages && line.match(/^\s*0 vector Flags/)) {
            inLanguages = false;
            inLanguageIndex = -1;
        }
        
        if (inTermData && inLanguages) {
          const indexMatch = line.match(/^\s*\[(\d+)\]\s*$/);
          if (indexMatch) {
            inLanguageIndex = parseInt(indexMatch[1]);
          } else if (inLanguageIndex === unityConfig.targetLanguageIndex) {
            const firstQuote = line.indexOf('"');
            const lastQuote = line.lastIndexOf('"');
            if (firstQuote !== -1 && lastQuote !== -1 && firstQuote < lastQuote && line.includes("string data =")) {
              const prefix = line.substring(0, firstQuote + 1);
              const text = line.substring(firstQuote + 1, lastQuote);
              const suffix = line.substring(lastQuote);
              
              parsedLines.push({
                id: i,
                originalContent: line,
                isTranslatable: true,
                prefix,
                text,
                suffix
              });
              continue;
            }
          }
        }
        
        parsedLines.push({
          id: i,
          originalContent: line,
          isTranslatable: false,
          prefix: line,
          text: '',
          suffix: ''
        });
      }
      
      return {
        fileName,
        lines: parsedLines,
        timestamp: Date.now(),
        regexPattern,
        unityConfig
      };
    } catch (e) {
      console.error("Failed to parse Unity config or content:", e);
    }
  }

  if (regexPattern.startsWith('CSV_CONFIG:')) {
    try {
      const configStr = regexPattern.substring('CSV_CONFIG:'.length).trim();
      const csvConfig: CsvConfig = JSON.parse(configStr);
      
      let delimiter = csvConfig.delimiter;
      if (delimiter === '\\t') delimiter = '\t';

      if (csvConfig.isUnityTextAssetFormat) {
          const rawLines = content.split(/\r?\n/);
          const parsedLines: ParsedLine[] = [];
          
          let foundTextAssetProperty = false;

          for (let i = 0; i < rawLines.length; i++) {
              const line = rawLines[i];
              // Support standard matching pattern for string properties with quotes holding potentially escaped newlines
              const match = line.match(/^(\s*\d+\s+string\s+[a-zA-Z0-9_]+\s*=\s*")(.*)("\s*)$/);
              
              if (match) {
                 foundTextAssetProperty = true;
                 const prefix = match[1];
                 const giantString = match[2];
                 const suffix = match[3];
                 
                 // Un-escape literal \r\n explicitly inserted by Unity TextAsset 
                 const unescapedString = giantString.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
                 
                 const parsed = Papa.parse<string[]>(unescapedString, {
                     delimiter: delimiter,
                     quoteChar: csvConfig.quoteChar,
                     escapeChar: csvConfig.escapeChar,
                     header: false,
                     skipEmptyLines: false // We need to perfectly map structure!
                 });
                 
                 const parts: { isTranslatable: boolean, text: string }[] = [];
                 
                 parsed.data.forEach((row, rowIndex) => {
                     const isHeader = (csvConfig.headerRowIndex !== undefined && csvConfig.headerRowIndex >= 0 && rowIndex <= csvConfig.headerRowIndex);
                     
                     if (!isHeader && row.length > csvConfig.targetColumn) {
                         const text = row[csvConfig.targetColumn];
                         if (text && text.trim().length > 0) {
                             parts.push({ isTranslatable: true, text });
                         }
                     }
                 });
                 
                 parsedLines.push({
                     id: i,
                     originalContent: line,
                     isTranslatable: parts.length > 0,
                     prefix: prefix,
                     text: '',
                     suffix: suffix,
                     parts: parts, 
                     embeddedCsv: {
                         data: parsed.data,
                         targetColumn: csvConfig.targetColumn,
                         headerRowIndex: csvConfig.headerRowIndex
                     }
                 });
              } else {
                  parsedLines.push({
                      id: i,
                      originalContent: line,
                      isTranslatable: false,
                      prefix: line,
                      text: '',
                      suffix: ''
                  });
              }
          }
          
          if (!foundTextAssetProperty) {
              console.warn("Parse WARNING: Unity TextAsset property regex matched no lines! Please verify file format.");
          }

          return {
            fileName,
            lines: parsedLines,
            timestamp: Date.now(),
            regexPattern,
            csvConfig,
          };
      }

      const parsed = Papa.parse<string[]>(content, {
        delimiter: delimiter,
        quoteChar: csvConfig.quoteChar,
        escapeChar: csvConfig.escapeChar,
        header: false,
        skipEmptyLines: !csvConfig.allowMultiLine,
      });

      const parsedLines: ParsedLine[] = parsed.data.map((row, index) => {
        if (row.length === 1 && row[0] === "") {
           return {
             id: index,
             originalContent: '',
             isTranslatable: false,
             prefix: '',
             text: '',
             suffix: '',
             csvRow: row,
           };
        }

        if (csvConfig.headerRowIndex !== undefined && csvConfig.headerRowIndex >= 0 && index <= csvConfig.headerRowIndex) {
          return {
            id: index,
            originalContent: Papa.unparse([row], { delimiter: delimiter, quoteChar: csvConfig.quoteChar }),
            isTranslatable: false,
            prefix: '',
            text: '',
            suffix: '',
            csvRow: row,
          };
        }

        if (row.length > csvConfig.targetColumn) {
          const text = row[csvConfig.targetColumn];
          return {
            id: index,
            originalContent: Papa.unparse([row], { delimiter: delimiter, quoteChar: csvConfig.quoteChar }),
            isTranslatable: !!text && text.trim().length > 0,
            prefix: '',
            text: text || '',
            suffix: '',
            csvRow: row,
          };
        }
        
        return {
          id: index,
          originalContent: Papa.unparse([row], { delimiter: delimiter, quoteChar: csvConfig.quoteChar }),
          isTranslatable: false,
          prefix: '',
          text: '',
          suffix: '',
          csvRow: row,
        };
      });

      return {
        fileName,
        lines: parsedLines,
        timestamp: Date.now(),
        regexPattern,
        csvConfig,
      };
    } catch (e) {
      console.error("Failed to parse CSV config or content:", e);
      // Fallback to normal regex parsing if it fails
    }
  }

  // Split by any newline format
  const rawLines = content.split(/\r?\n/);
  
  let regex: RegExp;
  try {
    regex = new RegExp(regexPattern);
  } catch (e) {
    console.error("Invalid regex pattern:", regexPattern);
    regex = /^(.*)$/; // Fallback
  }
  
  const parsedLines: ParsedLine[] = rawLines.map((line, index) => {
    
    // Check if line matches the dynamic format
    const match = line.match(regex);

    if (match && match.length >= 3 && match.length % 2 === 0) { // match.length includes the full match at index 0, so 4, 6, 8...
      const parts: { isTranslatable: boolean, text: string }[] = [];
      for (let i = 2; i < match.length - 1; i++) {
        parts.push({
          isTranslatable: i % 2 === 0,
          text: match[i] || ''
        });
      }

      return {
        id: index,
        originalContent: line,
        isTranslatable: true,
        prefix: match[1] || '',
        text: match[2] || '',
        suffix: match[match.length - 1] || '',
        parts: parts
      };
    }

    // Default: Non-translatable (headers, empty lines, or different types)
    return {
      id: index,
      originalContent: line,
      isTranslatable: false,
      prefix: line,
      text: '',
      suffix: '',
    };
  });

  return {
    fileName,
    lines: parsedLines,
    timestamp: Date.now(),
    regexPattern,
  };
};

export const generateExportText = (projectMap: ProjectMap): string => {
  if (projectMap.ue5Config) {
    return projectMap.lines
      .filter(line => line.isTranslatable)
      .map(line => line.text.replace(/\r/g, '\\r').replace(/\n/g, '\\n'))
      .join('\r\n');
  }

  // Filter out non-translatable lines completely to avoid empty lines in the text file
  // Join with CRLF for Windows compatibility
  // Escape newlines so multiline CSV fields don't break the line-by-line translation format
  return projectMap.lines
    .filter(line => line.isTranslatable)
    .flatMap(line => {
      if (line.parts && line.parts.length > 0) {
        return line.parts.filter(p => p.isTranslatable).map(p => p.text.replace(/\r/g, '\\r').replace(/\n/g, '\\n'));
      }
      return [line.text.replace(/\r/g, '\\r').replace(/\n/g, '\\n')];
    })
    .join('\r\n');
};

export const generateMergedFile = (projectMap: ProjectMap, translatedText: string): string => {
  const translatedLines = translatedText.split(/\r?\n/);
  let translationIndex = 0;

  if (projectMap.ue5Config && projectMap.ue5Data) {
    const clonedData = JSON.parse(JSON.stringify(projectMap.ue5Data));

    for (const line of projectMap.lines) {
      if (line.isTranslatable && line.ue5Path) {
        let translatedLineContent = line.text;
        if (translationIndex < translatedLines.length) {
          translatedLineContent = translatedLines[translationIndex].replace(/\\r/g, '\r').replace(/\\n/g, '\n');
          translationIndex++;
        }

        // Apply using lodash-like set
        const parts = line.ue5Path.split('.');
        let current = clonedData;
        for (let i = 0; i < parts.length - 1; i++) {
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = translatedLineContent;
      }
    }
    
    return JSON.stringify(clonedData, null, 2);
  }

  if (projectMap.csvConfig) {
    const { delimiter, quoteChar, targetColumn, isUnityTextAssetFormat } = projectMap.csvConfig;
    let actualDelimiter = delimiter;
    if (actualDelimiter === '\\t') actualDelimiter = '\t';

    if (isUnityTextAssetFormat) {
      // Reconstruct the file line by line
      return projectMap.lines.map(line => {
        if (!line.embeddedCsv) {
          return line.originalContent;
        }

        // We have an embedded CSV to reconstruct
        const newData = line.embeddedCsv.data.map((row, rowIndex) => {
          const isHeader = (line.embeddedCsv!.headerRowIndex !== undefined && line.embeddedCsv!.headerRowIndex >= 0 && rowIndex <= line.embeddedCsv!.headerRowIndex);
          if (isHeader || row.length <= line.embeddedCsv!.targetColumn || row.length === 1 && row[0] === "") {
            return row;
          }

          const existingText = row[line.embeddedCsv!.targetColumn];
          if (!existingText || existingText.trim().length === 0) {
            return row;
          }

          let translatedLineContent = existingText;
          if (translationIndex < translatedLines.length) {
            translatedLineContent = translatedLines[translationIndex].replace(/\\r/g, '\r').replace(/\\n/g, '\n');
            translationIndex++;
          }

          const newRow = [...row];
          newRow[line.embeddedCsv!.targetColumn] = translatedLineContent;
          return newRow;
        });

        const unparsedEmbeddedCsv = Papa.unparse(newData, {
          delimiter: actualDelimiter,
          quoteChar: quoteChar,
          newline: '\r\n' // Papa uses actual newlines \r\n, we will replace them with literal \\r\\n
        });

        // Convert the structural newlines created by unparse back into literal strings
        const stringifiedCsv = unparsedEmbeddedCsv.replace(/\r?\n/g, '\\r\\n');
        
        return `${line.prefix}${stringifiedCsv}${line.suffix}`;
      }).join('\r\n');
    }

    const newData = projectMap.lines.map(line => {
      if (!line.isTranslatable || !line.csvRow) {
        return line.csvRow || [];
      }
      
      let translatedLineContent = line.text;
      if (translationIndex < translatedLines.length) {
        // Unescape newlines
        translatedLineContent = translatedLines[translationIndex].replace(/\\r/g, '\r').replace(/\\n/g, '\n');
        translationIndex++;
      }
      
      const newRow = [...line.csvRow];
      newRow[targetColumn] = translatedLineContent;
      return newRow;
    });
    
    return Papa.unparse(newData, {
      delimiter: actualDelimiter,
      quoteChar: quoteChar,
      newline: '\r\n'
    });
  }

  // Debug log to check counts
  const expectedCount = projectMap.lines.reduce((acc, line) => {
    if (!line.isTranslatable) return acc;
    if (line.parts && line.parts.length > 0) {
      return acc + line.parts.filter(p => p.isTranslatable).length;
    }
    return acc + 1;
  }, 0);
  console.log(`Merging: Expected ${expectedCount} lines, got ${translatedLines.length} in translation file.`);

  // Map lines and join with CRLF (\r\n) as requested
  return projectMap.lines.map((line) => {
    if (!line.isTranslatable) {
      return line.originalContent;
    }

    if (line.parts && line.parts.length > 0) {
      let mergedLine = line.prefix;
      for (const part of line.parts) {
        if (part.isTranslatable) {
          if (translationIndex < translatedLines.length) {
            mergedLine += translatedLines[translationIndex];
            translationIndex++;
          } else {
            mergedLine += part.text;
          }
        } else {
          mergedLine += part.text;
        }
      }
      mergedLine += line.suffix;
      return mergedLine;
    }

    // Get the next available translated line from the list
    let translatedLineContent = line.text; // Fallback to original
    
    if (translationIndex < translatedLines.length) {
      // Do NOT unescape \n to actual newlines for Regex formats!
      // Regex matched lines never contained actual newlines, so any \n is a literal \n.
      translatedLineContent = translatedLines[translationIndex];
      translationIndex++;
    }
    
    // Reconstruct the line: Prefix + TranslatedText + Suffix
    return `${line.prefix}${translatedLineContent}${line.suffix}`;
  }).join('\r\n');
};