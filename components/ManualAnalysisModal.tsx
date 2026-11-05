import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Maximize, Minimize, Check, Copy, Sparkles, Shield, Zap, 
  Eye, AlertTriangle, CheckCircle2, XCircle, X, ArrowRight, Sliders, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from './Button';
import { Mark, RegexProposal, generateRegexProposals } from '../services/regexBuilder';
import { testRegexAcrossLines, RegexTestReport } from '../services/regexTester';

interface TextMark {
  text: string;
  start: number;
  end: number;
}

interface ManualMarksRecord {
  [lineIndex: number]: {
    translatable?: TextMark[];
    technical?: TextMark[];
  };
}

interface ManualAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: string[];
  initialMarks?: ManualMarksRecord;
  onApplyRegex: (pattern: string) => void;
}

export const ManualAnalysisModal: React.FC<ManualAnalysisModalProps> = ({
  isOpen,
  onClose,
  lines,
  initialMarks = {},
  onApplyRegex,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewStart, setViewStart] = useState(0);
  const [viewCount, setViewCount] = useState(100);
  const [marks, setMarks] = useState<ManualMarksRecord>(initialMarks);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);
  const [goToLineInput, setGoToLineInput] = useState('');
  const [copiedPattern, setCopiedPattern] = useState<string | null>(null);
  const [selectedProposalIndex, setSelectedProposalIndex] = useState<number>(1); // default to Smart (index 1)
  const [customPattern, setCustomPattern] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'matches' | 'unmatched'>('matches');
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(true);
  const [lineSearchQuery, setLineSearchQuery] = useState('');

  const lineContainerRef = useRef<HTMLDivElement>(null);

  // Set active line to first marked line if available, or first non-empty line
  useEffect(() => {
    if (Object.keys(initialMarks).length > 0) {
      const firstMarked = Object.keys(initialMarks)[0];
      if (firstMarked !== undefined) {
        setActiveLineIndex(parseInt(firstMarked, 10));
      }
    } else {
      const firstNonEmpty = lines.findIndex(l => l.trim().length > 0);
      if (firstNonEmpty !== -1) {
        setActiveLineIndex(firstNonEmpty);
      }
    }
  }, [lines, initialMarks]);

  // Keep viewStart aligned so activeLineIndex is visible
  useEffect(() => {
    if (activeLineIndex < viewStart || activeLineIndex >= viewStart + viewCount) {
      const newStart = Math.max(0, Math.floor(activeLineIndex / 50) * 50);
      setViewStart(newStart);
    }
  }, [activeLineIndex, viewCount]);

  // Active line content
  const activeLine = lines[activeLineIndex] || '';
  const activeLineMarks = marks[activeLineIndex] || { translatable: [], technical: [] };

  // Generate Proposals for active line
  const proposals: RegexProposal[] = useMemo(() => {
    const translatableMarks: Mark[] = (activeLineMarks.translatable || []).map(m => ({ ...m, type: 'translatable' }));
    const technicalMarks: Mark[] = (activeLineMarks.technical || []).map(m => ({ ...m, type: 'technical' }));

    if (translatableMarks.length === 0) {
      return [];
    }

    return generateRegexProposals(activeLine, translatableMarks, technicalMarks);
  }, [activeLine, activeLineMarks]);

  // Active pattern being tested: either custom pattern (if user typed) or selected proposal pattern
  const currentTestPattern = useMemo(() => {
    if (customPattern.trim()) {
      return customPattern.trim();
    }
    if (proposals.length > 0 && selectedProposalIndex < proposals.length) {
      return proposals[selectedProposalIndex].pattern;
    }
    return '';
  }, [customPattern, proposals, selectedProposalIndex]);

  // Test report across all lines of the file in real time
  const testReport: RegexTestReport = useMemo(() => {
    if (!currentTestPattern) {
      return {
        isValid: false,
        totalLines: lines.length,
        matchedCount: 0,
        matchPercentage: 0,
        matchedSamples: [],
        unmatchedSamples: [],
        captureGroupCount: 0
      };
    }
    return testRegexAcrossLines(currentTestPattern, lines, 50, 50);
  }, [currentTestPattern, lines]);

  // Also pre-calculate match rates for all 3 proposals so user sees them on the cards!
  const proposalReports = useMemo(() => {
    return proposals.map(p => testRegexAcrossLines(p.pattern, lines, 5, 5));
  }, [proposals, lines]);

  // Handle Marking from window selection
  const handleMarkSelection = (type: 'translatable' | 'technical' | 'clear') => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);

    const getLineElement = (node: Node | null): HTMLElement | null => {
      let current = node;
      while (current && current !== document.body) {
        if (current instanceof HTMLElement && current.dataset.contentIndex) {
          return current;
        }
        current = current.parentNode;
      }
      return null;
    };

    const startLineEl = getLineElement(range.startContainer);
    const endLineEl = getLineElement(range.endContainer);

    if (!startLineEl || !endLineEl) return;

    const startLineIdx = parseInt(startLineEl.dataset.contentIndex!, 10);
    const endLineIdx = parseInt(endLineEl.dataset.contentIndex!, 10);

    const minLineIdx = Math.min(startLineIdx, endLineIdx);
    const maxLineIdx = Math.max(startLineIdx, endLineIdx);

    const getAbsoluteOffset = (container: Node, offset: number, lineDiv: HTMLElement) => {
      let absoluteOffset = 0;
      const walker = document.createTreeWalker(lineDiv, NodeFilter.SHOW_TEXT, null);
      let currentNode = walker.nextNode();
      while (currentNode) {
        if (currentNode === container) {
          absoluteOffset += offset;
          break;
        }
        absoluteOffset += currentNode.nodeValue?.length || 0;
        currentNode = walker.nextNode();
      }
      return absoluteOffset;
    };

    setMarks(prev => {
      const next = { ...prev };
      for (let i = minLineIdx; i <= maxLineIdx; i++) {
        let startOffset = 0;
        let endOffset = lines[i]?.length || 0;

        if (i === minLineIdx) {
          startOffset = getAbsoluteOffset(range.startContainer, range.startOffset, startLineEl);
        }
        if (i === maxLineIdx) {
          endOffset = getAbsoluteOffset(range.endContainer, range.endOffset, endLineEl);
        }

        if (startOffset >= endOffset) continue;

        const text = lines[i]?.substring(startOffset, endOffset) || '';
        if (text.length === 0) continue;

        const currentMark = next[i] || { translatable: [], technical: [] };
        const newMark = { text, start: startOffset, end: endOffset };

        if (type === 'translatable') {
          next[i] = { 
            ...currentMark, 
            translatable: [...(currentMark.translatable || []).filter(t => !(Math.max(startOffset, t.start) < Math.min(endOffset, t.end))), newMark] 
          };
        } else if (type === 'technical') {
          next[i] = { 
            ...currentMark, 
            technical: [...(currentMark.technical || []).filter(t => !(Math.max(startOffset, t.start) < Math.min(endOffset, t.end))), newMark] 
          };
        } else if (type === 'clear') {
          const newTranslatable = (currentMark.translatable || []).filter(t => 
            !(Math.max(startOffset, t.start) < Math.min(endOffset, t.end))
          );
          const newTechnical = (currentMark.technical || []).filter(t => 
            !(Math.max(startOffset, t.start) < Math.min(endOffset, t.end))
          );
          next[i] = { ...currentMark, translatable: newTranslatable, technical: newTechnical };
        }
      }
      return next;
    });

    setActiveLineIndex(minLineIdx);
    selection.removeAllRanges();
    setCustomPattern(''); // reset custom pattern when user makes new marks
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 't' || e.key === 'T') {
        handleMarkSelection('translatable');
      } else if (e.key === 'k' || e.key === 'K') {
        handleMarkSelection('technical');
      } else if (e.key === 'c' || e.key === 'C') {
        handleMarkSelection('clear');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lines, marks]);

  // Copy pattern to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPattern(text);
    setTimeout(() => setCopiedPattern(null), 2000);
  };

  // Handle go to line
  const handleGoToLine = (e: React.FormEvent) => {
    e.preventDefault();
    const lineNum = parseInt(goToLineInput, 10);
    if (!isNaN(lineNum) && lineNum >= 1 && lineNum <= lines.length) {
      const idx = lineNum - 1;
      setActiveLineIndex(idx);
      const newStart = Math.max(0, Math.floor(idx / 50) * 50);
      setViewStart(newStart);
      setGoToLineInput('');
    }
  };

  // Render marks on a line
  const renderLineWithMarks = (lineText: string, lineIndex: number) => {
    const lineMark = marks[lineIndex];
    if (!lineMark || (!lineMark.translatable?.length && !lineMark.technical?.length)) {
      return <span className="text-slate-300">{lineText || '\u00A0'}</span>;
    }

    const parts: { start: number; end: number; type: 'translatable' | 'technical'; text: string }[] = [];
    lineMark.translatable?.forEach(t => parts.push({ ...t, type: 'translatable' }));
    lineMark.technical?.forEach(t => parts.push({ ...t, type: 'technical' }));
    parts.sort((a, b) => a.start - b.start);

    // Filter overlapping
    const valid: typeof parts = [];
    let lastEnd = 0;
    for (const p of parts) {
      if (p.start >= lastEnd) {
        valid.push(p);
        lastEnd = p.end;
      }
    }

    const elements: React.ReactNode[] = [];
    let cur = 0;
    valid.forEach((p, idx) => {
      if (p.start > cur) {
        elements.push(<span key={`plain-${idx}`} className="text-slate-300">{lineText.substring(cur, p.start)}</span>);
      }
      if (p.type === 'translatable') {
        elements.push(
          <span 
            key={`trans-${idx}`} 
            className="bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 px-1 py-0.5 rounded font-semibold"
            title="Preložiteľný text"
          >
            {p.text}
          </span>
        );
      } else {
        elements.push(
          <span 
            key={`tech-${idx}`} 
            className="bg-amber-500/25 text-amber-300 border border-amber-500/40 px-1 py-0.5 rounded"
            title="Technická časť (nebude sa prekladať)"
          >
            {p.text}
          </span>
        );
      }
      cur = p.end;
    });

    if (cur < lineText.length) {
      elements.push(<span key="end" className="text-slate-300">{lineText.substring(cur)}</span>);
    }

    return <>{elements}</>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className={`bg-[#0a0f1d] border border-slate-800 shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
        isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-7xl h-[94vh] rounded-2xl'
      }`}>
        
        {/* Top Header */}
        <header className="px-6 py-3.5 border-b border-slate-800/80 bg-[#0d1527] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Search size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-wide">
                  Manuálna Analýza & Tvorba Regexu
                </h2>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-cyan-400 font-mono">
                  {lines.length} riadkov v súbore
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Označte text myšou a systém vygeneruje 3 overené stratégie s okamžitým testom zhôd
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-lg transition-colors"
              title={isFullscreen ? "Zmenšiť okno" : "Režim celej obrazovky"}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <Button 
              variant="secondary" 
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white"
            >
              Zavrieť
            </Button>
            <Button
              onClick={() => {
                if (currentTestPattern) {
                  onApplyRegex(currentTestPattern);
                  onClose();
                } else {
                  alert("Najprv označte text na preklad a vyberte vyhovujúci regulárny výraz.");
                }
              }}
              disabled={!currentTestPattern || !testReport.isValid}
              className="px-4 py-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-sm"
              title="Aplikovať tento vygenerovaný vzor do hlavného projektu"
            >
              Použiť vybraný vzor
            </Button>
          </div>
        </header>

        {/* Toolbar: Marking Actions & Navigation */}
        <div className="px-6 py-2.5 bg-[#0b1222] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium mr-1">Nástroje označovania:</span>
            
            <button 
              onClick={() => handleMarkSelection('translatable')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-medium transition-colors"
              title="Označte myšou text na preklad a stlačte (alebo stlačte kláves T)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Text na preklad (T)
            </button>

            <button 
              onClick={() => handleMarkSelection('technical')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-medium transition-colors"
              title="Označte myšou technickú časť, formátovanie alebo premennú (alebo stlačte kláves K)"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Technická časť (K)
            </button>

            <button 
              onClick={() => handleMarkSelection('clear')}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 transition-colors"
              title="Odstrániť označenie z vybraného úseku (alebo stlačte kláves C)"
            >
              Zmazať výber (C)
            </button>

            <button 
              onClick={() => setMarks({})}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors ml-1"
              title="Vymazať všetky vytvorené značky v súbore"
            >
              Vymazať všetko
            </button>
          </div>

          <div className="flex items-center gap-3">
            <form onSubmit={handleGoToLine} className="flex items-center gap-1.5">
              <span className="text-slate-400">Riadok:</span>
              <input
                type="number"
                min="1"
                max={lines.length}
                value={goToLineInput}
                onChange={(e) => setGoToLineInput(e.target.value)}
                placeholder={`${activeLineIndex + 1}`}
                className="w-18 bg-[#070b14] border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
              <button 
                type="submit" 
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
              >
                Prejsť
              </button>
            </form>

            <div className="flex items-center gap-1">
              <span className="text-slate-400 mr-1">Riadkov na stránku:</span>
              {[50, 100, 250].map(cnt => (
                <button
                  key={cnt}
                  onClick={() => setViewCount(cnt)}
                  className={`px-2 py-0.5 rounded text-xs font-mono ${
                    viewCount === cnt 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Split Screen Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* Left Column (7 cols): File Line Browser & Annotation */}
          <section className="lg:col-span-7 flex flex-col border-r border-slate-800 bg-[#070b14] min-h-0">
            
            {/* Active Sample Line Spotlight Bar */}
            <div className="p-3 bg-[#0c1322] border-b border-slate-800 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  Aktuálny vzorový riadok č. <strong className="text-cyan-300 font-mono">{activeLineIndex + 1}</strong>
                </span>
                <span className="text-[11px] text-slate-500">
                  Pre označenie myšou potiahnite text v riadku
                </span>
              </div>
              <div 
                className="p-2.5 rounded-lg bg-[#070b14] border border-cyan-500/30 font-mono text-xs overflow-x-auto select-text leading-relaxed"
                data-content-index={activeLineIndex}
              >
                {renderLineWithMarks(activeLine, activeLineIndex)}
              </div>
            </div>

            {/* Line Navigation Bar */}
            <div className="px-4 py-2 border-b border-slate-800/60 bg-[#090e1c] flex items-center justify-between text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-2">
                <span>Zobrazené riadky: <strong className="text-slate-200 font-mono">{viewStart + 1} – {Math.min(viewStart + viewCount, lines.length)}</strong> z {lines.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewStart(Math.max(0, viewStart - viewCount))}
                  disabled={viewStart === 0}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 font-mono"
                >
                  &larr; Predošlé
                </button>
                <button
                  onClick={() => setViewStart(Math.min(lines.length - 1, viewStart + viewCount))}
                  disabled={viewStart + viewCount >= lines.length}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 font-mono"
                >
                  Ďalšie &rarr;
                </button>
              </div>
            </div>

            {/* Scrollable Lines List */}
            <div 
              ref={lineContainerRef}
              className="flex-1 overflow-y-auto p-2 font-mono text-xs leading-relaxed selection:bg-cyan-500/30 selection:text-white"
            >
              {lines.slice(viewStart, viewStart + viewCount).map((line, offset) => {
                const actualIndex = viewStart + offset;
                const isActive = actualIndex === activeLineIndex;
                const hasMarks = !!(marks[actualIndex]?.translatable?.length || marks[actualIndex]?.technical?.length);

                return (
                  <div
                    key={actualIndex}
                    onClick={() => setActiveLineIndex(actualIndex)}
                    className={`flex items-start gap-3 px-2 py-1 rounded transition-colors cursor-pointer group ${
                      isActive 
                        ? 'bg-cyan-950/40 border border-cyan-500/40' 
                        : hasMarks 
                          ? 'bg-slate-800/40 border border-slate-700/60' 
                          : 'hover:bg-slate-800/30 border border-transparent'
                    }`}
                  >
                    <span className={`select-none w-10 text-right shrink-0 pt-0.5 ${
                      isActive ? 'text-cyan-400 font-bold' : hasMarks ? 'text-emerald-400 font-semibold' : 'text-slate-600'
                    }`}>
                      {actualIndex + 1}
                    </span>

                    <div 
                      className="flex-1 overflow-x-auto whitespace-pre select-text"
                      data-content-index={actualIndex}
                    >
                      {renderLineWithMarks(line, actualIndex)}
                    </div>

                    {hasMarks && (
                      <span className="text-[10px] text-emerald-400 px-1 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded shrink-0">
                        Označené
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Column (5 cols): 3-Strategy Proposals & Live Test */}
          <section className="lg:col-span-5 flex flex-col bg-[#0b101f] min-h-0 overflow-y-auto p-4 space-y-4">
            
            {/* Header & Strategy Selector */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                Návrhy Regulárneho Výrazu
              </h3>
              {proposals.length > 0 && (
                <span className="text-xs text-cyan-400 font-medium">
                  3 stratégie pripravené
                </span>
              )}
            </div>

            {proposals.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 mb-3">
                  <Search size={22} />
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">
                  Zatiaľ nie je označený žiadny text
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  V ľavom okne označte myšou časť riadku, ktorú chcete prekladať, a kliknite na tlačidlo <strong className="text-emerald-400">"Text na preklad (T)"</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.map((proposal, idx) => {
                  const report = proposalReports[idx];
                  const isSelected = selectedProposalIndex === idx && !customPattern;
                  
                  return (
                    <div 
                      key={proposal.type}
                      onClick={() => {
                        setSelectedProposalIndex(idx);
                        setCustomPattern('');
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40' 
                          : 'bg-[#0e1628] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {proposal.type === 'smart' && (
                            <span className="p-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                              <Zap size={14} />
                            </span>
                          )}
                          {proposal.type === 'strict' && (
                            <span className="p-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/40">
                              <Shield size={14} />
                            </span>
                          )}
                          {proposal.type === 'flexible' && (
                            <span className="p-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                              <Sliders size={14} />
                            </span>
                          )}
                          <span className="text-xs font-bold text-white tracking-wide">
                            {proposal.title}
                          </span>
                        </div>

                        {proposal.isRecommended && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            Odporúčané
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                        {proposal.description}
                      </p>

                      {/* Code block with copy button */}
                      <div className="relative group mb-2.5">
                        <div className="p-2 rounded bg-[#070b14] border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto pr-8">
                          {proposal.pattern}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(proposal.pattern);
                          }}
                          className="absolute right-1.5 top-1.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Skopírovať vzor do schránky"
                        >
                          {copiedPattern === proposal.pattern ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>

                      {/* Live Match Metrics & Progress Bar */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Úspešnosť zhôd:</span>
                          <span className={`font-bold ${
                            report?.matchPercentage > 80 ? 'text-emerald-400' : report?.matchPercentage > 40 ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            {report?.matchedCount} / {report?.totalLines} ({report?.matchPercentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              report?.matchPercentage > 80 ? 'bg-emerald-400' : report?.matchPercentage > 40 ? 'bg-amber-400' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${Math.min(100, report?.matchPercentage || 0)}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/50">
                        <span className="text-[11px] text-slate-500">
                          {proposal.explanation}
                        </span>
                        <Button
                          variant={isSelected ? 'primary' : 'secondary'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProposalIndex(idx);
                            setCustomPattern('');
                            onApplyRegex(proposal.pattern);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-xs shrink-0 ml-2"
                        >
                          Aplikovať
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom Pattern Tweaker Box */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0e1628]/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders size={14} className="text-cyan-400" />
                  Vlastná úprava Regexu
                </label>
                {customPattern && (
                  <button 
                    onClick={() => setCustomPattern('')}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    Obnoviť na návrh
                  </button>
                )}
              </div>
              <input
                type="text"
                value={customPattern || (proposals[selectedProposalIndex]?.pattern || '')}
                onChange={(e) => setCustomPattern(e.target.value)}
                placeholder="Sem môžete vložiť alebo doladiť Regex..."
                className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-400">
                Akékoľvek ručné zmeny sa okamžite otestujú oproti súboru v spodnom diagnostickom paneli.
              </p>
            </div>
          </section>
        </div>

        {/* Bottom Diagnostic Drawer: Live Matches & Unmatched Lines */}
        <section className="border-t border-slate-800 bg-[#0a0f1c] shrink-0">
          <div className="px-6 py-2 bg-[#0c1425] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="text-slate-400">Diagnostika zhôd vzoru:</span>

              <button
                onClick={() => setActiveTab('matches')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'matches' 
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 size={13} className="text-emerald-400" />
                Zachytené riadky ({testReport.matchedCount})
              </button>

              <button
                onClick={() => setActiveTab('unmatched')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'unmatched' 
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle size={13} className="text-rose-400" />
                Nezachytené riadky ({testReport.unmatchedSamples.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400">
                Celkovo zachytených: <strong>{testReport.matchedCount} / {testReport.totalLines}</strong> ({testReport.matchPercentage}%)
              </span>
              <button
                onClick={() => setIsDiagnosticOpen(!isDiagnosticOpen)}
                className="p-1 text-slate-400 hover:text-white"
                title={isDiagnosticOpen ? "Zbaliť diagnostický náhľad" : "Rozbaliť diagnostický náhľad"}
              >
                {isDiagnosticOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </div>
          </div>

          {isDiagnosticOpen && (
            <div className="h-44 overflow-y-auto p-3 font-mono text-xs bg-[#070b14]">
              {activeTab === 'matches' ? (
                testReport.matchedSamples.length === 0 ? (
                  <div className="text-center text-slate-500 py-6">
                    {testReport.error || "Aktuálny regulárny výraz nezachytil žiadne riadky."}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {testReport.matchedSamples.map(sample => (
                      <div key={sample.lineIndex} className="flex items-start gap-2.5 p-1.5 rounded hover:bg-slate-800/40">
                        <span className="text-slate-500 w-10 text-right select-none shrink-0 font-mono">
                          {sample.lineIndex + 1}
                        </span>
                        <div className="flex-1 overflow-x-auto whitespace-pre">
                          <span className="text-slate-400">{sample.original}</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {sample.translatableTexts.map((txt, ti) => (
                            <span 
                              key={ti} 
                              className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px]"
                              title={`Extrahovaný prekladateľný text zo skupiny`}
                            >
                              "{txt}"
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                testReport.unmatchedSamples.length === 0 ? (
                  <div className="text-center text-emerald-400 py-6 flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    Skvelé! Všetky riadky v súbore zodpovedajú vygenerovanému vzoru (alebo sú prázdne).
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {testReport.unmatchedSamples.map(sample => (
                      <div key={sample.lineIndex} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/40">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0 mr-3">
                          <span className="text-rose-400 w-10 text-right select-none shrink-0 font-mono">
                            {sample.lineIndex + 1}
                          </span>
                          <span className="text-slate-400 truncate font-mono">
                            {sample.original}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setActiveLineIndex(sample.lineIndex);
                            const newStart = Math.max(0, Math.floor(sample.lineIndex / 50) * 50);
                            setViewStart(newStart);
                          }}
                          className="px-2 py-0.5 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 shrink-0 transition-colors"
                        >
                          Analyzovať tento riadok
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
