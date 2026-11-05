export interface MatchedLineSample {
    lineIndex: number;
    original: string;
    groups: string[];
    translatableTexts: string[];
}

export interface UnmatchedLineSample {
    lineIndex: number;
    original: string;
}

export interface RegexTestReport {
    isValid: boolean;
    error?: string;
    totalLines: number;
    matchedCount: number;
    matchPercentage: number;
    matchedSamples: MatchedLineSample[];
    unmatchedSamples: UnmatchedLineSample[];
    captureGroupCount: number;
}

/**
 * Tests a regex pattern across an array of file lines and returns a detailed report
 * with matched and unmatched samples for the split-screen UI.
 */
export function testRegexAcrossLines(
    pattern: string,
    lines: string[],
    maxMatchedSamples = 50,
    maxUnmatchedSamples = 50
): RegexTestReport {
    if (!pattern || !pattern.trim()) {
        return {
            isValid: false,
            error: "Zadajte alebo vygenerujte regulárny výraz.",
            totalLines: lines.length,
            matchedCount: 0,
            matchPercentage: 0,
            matchedSamples: [],
            unmatchedSamples: [],
            captureGroupCount: 0
        };
    }

    let regex: RegExp;
    try {
        regex = new RegExp(pattern);
    } catch (err: any) {
        return {
            isValid: false,
            error: `Neplatný regulárny výraz: ${err.message}`,
            totalLines: lines.length,
            matchedCount: 0,
            matchPercentage: 0,
            matchedSamples: [],
            unmatchedSamples: [],
            captureGroupCount: 0
        };
    }

    let matchedCount = 0;
    const matchedSamples: MatchedLineSample[] = [];
    const unmatchedSamples: UnmatchedLineSample[] = [];
    let captureGroupCount = 0;

    // Scan lines
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Ignore purely empty lines for non-match noise if they are standard blank lines, but count them if matched
        const match = line.match(regex);

        if (match) {
            matchedCount++;
            const groups = match.slice(1);
            if (captureGroupCount === 0 && groups.length > 0) {
                captureGroupCount = groups.length;
            }

            if (matchedSamples.length < maxMatchedSamples) {
                // Determine translatable texts:
                // Standard RegExtract structure has Prefix (group 1), Translatable 1 (group 2), Gap (group 3)...
                // Or if 1 group: group 1
                // Or if multiple groups (prefix, text1, gap, text2, suffix): odd indices from 1 are translatable
                const translatableTexts: string[] = [];
                if (groups.length === 1) {
                    translatableTexts.push(groups[0]);
                } else if (groups.length === 2) {
                    // Usually prefix + translatable or translatable + suffix
                    translatableTexts.push(groups[1]);
                } else if (groups.length >= 3) {
                    // Multi-group: index 0 = prefix, 1 = translatable 1, 2 = gap/suffix, 3 = translatable 2...
                    for (let g = 1; g < groups.length; g += 2) {
                        translatableTexts.push(groups[g]);
                    }
                }

                matchedSamples.push({
                    lineIndex: i,
                    original: line,
                    groups,
                    translatableTexts: translatableTexts.length > 0 ? translatableTexts : [groups[0] || '']
                });
            }
        } else {
            // Unmatched
            if (unmatchedSamples.length < maxUnmatchedSamples && line.trim().length > 0) {
                unmatchedSamples.push({
                    lineIndex: i,
                    original: line
                });
            }
        }
    }

    const matchPercentage = lines.length > 0 
        ? Math.round((matchedCount / lines.length) * 1000) / 10 
        : 0;

    return {
        isValid: true,
        totalLines: lines.length,
        matchedCount,
        matchPercentage,
        matchedSamples,
        unmatchedSamples,
        captureGroupCount
    };
}
