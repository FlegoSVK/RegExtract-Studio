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

function escapeRegExp(text: string) {
    if (!text) return "";
    // Escape specific regex syntax characters (added forward slash)
    let escaped = text.replace(/[-[\]{}()*+?.,\\^$|#\/]/g, '\\$&');
    
    // Use \s+ instead of \s* to prevent group swallowing (enforces literal boundaries)
    escaped = escaped.replace(/\s+/g, '\\s+');
    
    // Removed \d+ auto-generalization to prevent identical structural lines with different numbers 
    // from matching incorrectly, and to provide reliable boundary anchors between wildcards.
    return escaped;
}

function buildGroupRegex(chunks: Chunk[]): string {
    let regex = "";
    for (const chunk of chunks) {
        if (chunk.type === 'literal') {
            regex += escapeRegExp(chunk.text);
        } else if (chunk.type === 'technical') {
            regex += '.*?';
        }
    }
    return `(${regex})`;
}

export function generateRegexFromManualSelection(line: string, translatableMarks: Mark[], technicalMarks: Mark[]): string | null {
    // Sort marks by start position
    const sortedMarks = [...translatableMarks, ...technicalMarks].sort((a, b) => a.start - b.start);
    
    // Filter out overlaps safely to prevent duplicate sequencing
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
    
    if (translatableIndices.length === 0) return null;
    
    let regexStr = "^";
    
    // Group 1: Prefix
    const prefixChunks = chunks.slice(0, translatableIndices[0]);
    regexStr += buildGroupRegex(prefixChunks);
    
    for (let i = 0; i < translatableIndices.length; i++) {
        // Translatable Group
        regexStr += `(.*?)`;
        
        // Gap or Suffix Group
        if (i < translatableIndices.length - 1) {
            // Gap between translatable[i] and translatable[i+1]
            const gapChunks = chunks.slice(translatableIndices[i] + 1, translatableIndices[i+1]);
            regexStr += buildGroupRegex(gapChunks);
        } else {
            // Suffix
            const suffixChunks = chunks.slice(translatableIndices[i] + 1);
            regexStr += buildGroupRegex(suffixChunks);
        }
    }
    
    regexStr += "$";
    
    return regexStr;
}
