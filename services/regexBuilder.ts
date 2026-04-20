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
    let escaped = text.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
    escaped = escaped.replace(/\s+/g, '\\s*');
    escaped = escaped.replace(/\d+/g, '\\d+');
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
    const allMarks = [...translatableMarks, ...technicalMarks].sort((a, b) => a.start - b.start);
    
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
