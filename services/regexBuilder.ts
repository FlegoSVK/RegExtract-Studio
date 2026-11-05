export interface Mark {
    start: number;
    end: number;
    text: string;
    type: 'translatable' | 'technical';
}

export interface Chunk {
    type: 'literal' | 'translatable' | 'technical';
    text: string;
}

export interface RegexProposal {
    type: 'strict' | 'smart' | 'flexible';
    title: string;
    pattern: string;
    description: string;
    explanation: string;
    captureCount: number;
    isRecommended?: boolean;
}

function escapeRegExp(text: string): string {
    if (!text) return "";
    return text.replace(/[-[\]{}()*+?.,\\^$|#\/]/g, '\\$&');
}

/**
 * Escapes characters for strict matching while preserving space tolerance
 */
function escapeStrict(text: string): string {
    if (!text) return "";
    let escaped = escapeRegExp(text);
    return escaped.replace(/\s+/g, '\\s+');
}

/**
 * Builds smart regex chunk by recognizing dynamic tokens:
 * - Numbers (IDs, counts) -> \d+
 * - Quoted string bounds
 * - XML/HTML tag structures
 * - Spacing flexibility
 */
function buildSmartChunkRegex(chunkText: string): string {
    if (!chunkText) return "";
    
    // Check if the chunk is just whitespace
    if (/^\s+$/.test(chunkText)) {
        return '\\s+';
    }

    let result = escapeRegExp(chunkText);

    // Generalize numeric IDs of 1 or more digits if surrounded by non-digits or borders
    result = result.replace(/(?<=\D|^)\d+(?=\D|$)/g, '\\d+');

    // Make whitespace flexible (match any whitespace sequence)
    result = result.replace(/\\\s\+/g, '\\s+').replace(/\s+/g, '\\s*');

    return result;
}

function buildGroupRegex(chunks: Chunk[], strategy: 'strict' | 'smart' | 'flexible'): string {
    let regex = "";
    for (const chunk of chunks) {
        if (chunk.type === 'literal') {
            if (strategy === 'strict') {
                regex += escapeStrict(chunk.text);
            } else if (strategy === 'smart') {
                regex += buildSmartChunkRegex(chunk.text);
            } else {
                // flexible: allow non-greedy skip between literal tokens
                const clean = chunk.text.trim();
                if (clean) {
                    regex += `.*?${escapeRegExp(clean)}.*?`;
                } else {
                    regex += '\\s*';
                }
            }
        } else if (chunk.type === 'technical') {
            if (strategy === 'strict') {
                regex += '.*?';
            } else if (strategy === 'smart') {
                // If the technical text is a number, use \d+; otherwise non-greedy
                if (/^\d+$/.test(chunk.text.trim())) {
                    regex += '\\d+';
                } else if (/^[a-zA-Z0-9_\-]+$/.test(chunk.text.trim())) {
                    regex += '[\\w\\-]+';
                } else {
                    regex += '.*?';
                }
            } else {
                regex += '.*?';
            }
        }
    }
    return `(${regex})`;
}

/**
 * Splits the line into chunks according to user marks
 */
function decomposeLineIntoChunks(line: string, translatableMarks: Mark[], technicalMarks: Mark[]): { chunks: Chunk[]; translatableIndices: number[] } {
    const sortedMarks = [...translatableMarks, ...technicalMarks].sort((a, b) => a.start - b.start);
    
    const allMarks: Mark[] = [];
    let lastEnd = 0;
    for (const mark of sortedMarks) {
        if (mark.start >= lastEnd) {
            allMarks.push(mark);
            lastEnd = mark.end;
        }
    }
    
    const chunks: Chunk[] = [];
    let currentPos = 0;
    
    for (const mark of allMarks) {
        if (mark.start > currentPos) {
            chunks.push({ type: 'literal', text: line.substring(currentPos, mark.start) });
        }
        chunks.push({ type: mark.type, text: mark.text });
        currentPos = mark.end;
    }
    
    if (currentPos < line.length) {
        chunks.push({ type: 'literal', text: line.substring(currentPos) });
    }
    
    const translatableIndices: number[] = [];
    chunks.forEach((c, idx) => {
        if (c.type === 'translatable') {
            translatableIndices.push(idx);
        }
    });

    return { chunks, translatableIndices };
}

/**
 * Generates single regex for backward compatibility
 */
export function generateRegexFromManualSelection(line: string, translatableMarks: Mark[], technicalMarks: Mark[]): string | null {
    const proposals = generateRegexProposals(line, translatableMarks, technicalMarks);
    if (!proposals || proposals.length === 0) return null;
    // Prefer Smart Pattern or Strict
    const smart = proposals.find(p => p.type === 'smart') || proposals[0];
    return smart.pattern;
}

/**
 * Generates 3 multi-strategy proposals: Strict, Smart Pattern, and Flexible
 */
export function generateRegexProposals(line: string, translatableMarks: Mark[], technicalMarks: Mark[]): RegexProposal[] {
    const { chunks, translatableIndices } = decomposeLineIntoChunks(line, translatableMarks, technicalMarks);
    if (translatableIndices.length === 0) return [];

    const proposals: RegexProposal[] = [];

    // 1. STRICT STRATEGY
    let strictPattern = "^";
    const prefixChunks = chunks.slice(0, translatableIndices[0]);
    strictPattern += buildGroupRegex(prefixChunks, 'strict');

    for (let i = 0; i < translatableIndices.length; i++) {
        strictPattern += `(.*?)`;
        if (i < translatableIndices.length - 1) {
            const gapChunks = chunks.slice(translatableIndices[i] + 1, translatableIndices[i+1]);
            strictPattern += buildGroupRegex(gapChunks, 'strict');
        } else {
            const suffixChunks = chunks.slice(translatableIndices[i] + 1);
            strictPattern += buildGroupRegex(suffixChunks, 'strict');
        }
    }
    strictPattern += "$";

    proposals.push({
        type: 'strict',
        title: 'Prísny vzor (Strict)',
        pattern: strictPattern,
        description: 'Presné znaky a striktné ohraničenia podľa vybraného riadku.',
        explanation: 'Kopíruje doslovné reťazce pred a za textom. Vhodný, ak sú všetky riadky v súbore formátované úplne identicky.',
        captureCount: translatableIndices.length,
        isRecommended: false
    });

    // 2. SMART PATTERN STRATEGY (Recommended)
    // Inspect quotes around translatable text
    let smartPattern = "^";
    smartPattern += buildGroupRegex(prefixChunks, 'smart');

    for (let i = 0; i < translatableIndices.length; i++) {
        const transChunk = chunks[translatableIndices[i]];
        // Check if the preceding literal ends with a quote and following literal starts with matching quote
        const prevLiteral = i === 0 
            ? (prefixChunks.length > 0 ? prefixChunks[prefixChunks.length - 1].text : "")
            : (chunks[translatableIndices[i] - 1]?.text || "");
        const nextLiteral = i < translatableIndices.length - 1
            ? (chunks[translatableIndices[i] + 1]?.text || "")
            : (chunks.slice(translatableIndices[i] + 1).length > 0 ? chunks.slice(translatableIndices[i] + 1)[0].text : "");

        const isDoubleQuoted = prevLiteral.endsWith('"') && nextLiteral.startsWith('"');
        const isSingleQuoted = prevLiteral.endsWith("'") && nextLiteral.startsWith("'");

        if (isDoubleQuoted) {
            // Can capture everything up to next quote safely
            smartPattern += `([^"]*)`;
        } else if (isSingleQuoted) {
            smartPattern += `([^']*)`;
        } else {
            smartPattern += `(.*?)`;
        }

        if (i < translatableIndices.length - 1) {
            const gapChunks = chunks.slice(translatableIndices[i] + 1, translatableIndices[i+1]);
            smartPattern += buildGroupRegex(gapChunks, 'smart');
        } else {
            const suffixChunks = chunks.slice(translatableIndices[i] + 1);
            smartPattern += buildGroupRegex(suffixChunks, 'smart');
        }
    }
    smartPattern += "$";

    // Clean up empty groups or redundant parentheses if any
    smartPattern = smartPattern.replace(/\(\)/g, '');

    proposals.push({
        type: 'smart',
        title: 'Inteligentný vzor (Smart Pattern)',
        pattern: smartPattern,
        description: 'Automaticky zovšeobecňuje čísla, úvodzovky, tagy a flexibilné medzery.',
        explanation: 'Rozpoznáva dynamické čísla (\\d+), bezpečne ohraničuje texty v úvodzovkách a toleruje variabilné medzery. Ideálny pre väčšinu herných skriptov.',
        captureCount: translatableIndices.length,
        isRecommended: true
    });

    // 3. FLEXIBLE STRATEGY
    // Build a relaxed pattern that focuses on key boundary anchors
    let flexPattern = "^";
    
    // Extract key anchor words from prefix
    const prefixText = prefixChunks.map(c => c.text).join('').trim();
    if (prefixText.length > 0) {
        // Find last significant symbol or word in prefix
        const lastAnchorMatch = prefixText.match(/([=:,\(\)\[\]<>"']|[a-zA-Z0-9_-]+)\s*$/);
        if (lastAnchorMatch) {
            const anchor = escapeRegExp(lastAnchorMatch[1]);
            flexPattern += `(.*?[^\\w]?${anchor}\\s*)`;
        } else {
            flexPattern += `(.*?)`;
        }
    } else {
        flexPattern += `(.*?)`;
    }

    for (let i = 0; i < translatableIndices.length; i++) {
        flexPattern += `(.*?)`;
        if (i < translatableIndices.length - 1) {
            flexPattern += `(.*?)`;
        } else {
            const suffixText = chunks.slice(translatableIndices[i] + 1).map(c => c.text).join('').trim();
            if (suffixText.length > 0) {
                const firstAnchorMatch = suffixText.match(/^\s*([=:,\(\)\[\]<>"']|[a-zA-Z0-9_-]+)/);
                if (firstAnchorMatch) {
                    const anchor = escapeRegExp(firstAnchorMatch[1]);
                    flexPattern += `(\\s*${anchor}.*)$`;
                } else {
                    flexPattern += `(.*)$`;
                }
            } else {
                flexPattern += `(.*)$`;
            }
        }
    }

    proposals.push({
        type: 'flexible',
        title: 'Flexibilný vzor (Flexible)',
        pattern: flexPattern,
        description: 'Uvoľnené kotvy s voľným zachytávaním pre nekonzistentné súbory.',
        explanation: 'Používa kľúčové deliace znaky a dynamické medzery. Užitočný, ak rôzne riadky v dialógoch obsahujú odlišné dĺžky alebo voliteľné parametre.',
        captureCount: translatableIndices.length,
        isRecommended: false
    });

    return proposals;
}
