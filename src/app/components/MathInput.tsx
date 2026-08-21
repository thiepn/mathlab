import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { ParsedMath } from '../../lib/math/ast';
import { classifyParsed } from '../../lib/math/classify';
import { astToLatex } from '../../lib/math/format';
import { parseMath } from '../../lib/math/parser';
import { applySuggestion, getMathSuggestions, type MathSuggestion } from '../../lib/math/suggestions';
import { useInputHistory } from '../hooks/useInputHistory';
import { MathPreview } from './MathPreview';

interface MathInputProps {
  initialValue?: string;
  onChangeParsed?: (parsed: ParsedMath) => void;
  onSubmit?: (parsed: ParsedMath) => void;
}

const labels = {
  scalar: 'Scalar', expression: 'Expression', equation: 'Equation', inequality: 'Inequality', system: 'System', function: 'Function',
  vector: 'Vector', matrix: 'Matrix', sequence: 'Sequence', dataset: 'Dataset', distribution: 'Distribution', probability: 'Probability',
  proposition: 'Proposition', 'finite-set': 'Finite set', relation: 'Relation', graph: 'Graph', recurrence: 'Recurrence', complexity: 'Complexity', combinatorics: 'Combinatorics', ode: 'ODE IVP',
  unknown: 'Unresolved input',
};

const helpers = [
  { label: 'π', text: 'pi' },
  { label: '√', text: 'sqrt()' },
  { label: 'x²', text: '^2' },
  { label: '()', text: '()' },
  { label: '[]', text: '[]' },
  { label: ':=', text: ':=' },
  { label: '≤', text: '<=' },
  { label: '≥', text: '>=' },
  { label: ';', text: '; ' },
];

function insertAt(value: string, start: number, end: number, text: string) {
  const next = value.slice(0, start) + text + value.slice(end);
  const emptyPair = text.endsWith('()') || text.endsWith('[]');
  return { value: next, cursor: start + text.length - (emptyPair ? 1 : 0) };
}

export function MathInput({ initialValue = '', onChangeParsed, onSubmit }: MathInputProps) {
  const [value, setValue] = useState(initialValue);
  const [cursor, setCursor] = useState(initialValue.length);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { history, add, clear } = useInputHistory();

  const parsed = useMemo(() => parseMath(value), [value]);
  const kind = useMemo(() => classifyParsed(parsed), [parsed]);
  const errors = parsed.diagnostics.filter((item) => item.severity === 'error');
  const firstError = errors[0];
  const suggestions = useMemo(() => getMathSuggestions(value, cursor), [value, cursor]);
  const latex = parsed.ast && errors.length === 0 ? astToLatex(parsed.ast) : '';

  useEffect(() => onChangeParsed?.(parsed), [parsed, onChangeParsed]);
  useEffect(() => {
    setValue(initialValue);
    setCursor(initialValue.length);
    setHistoryIndex(-1);
  }, [initialValue]);
  useEffect(() => setSuggestionIndex(0), [value]);

  const focusAt = (position: number) => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(position, position);
    });
  };

  const commitSuggestion = (suggestion: MathSuggestion) => {
    const next = applySuggestion(value, cursor, suggestion);
    setValue(next.value);
    setCursor(next.cursor);
    focusAt(next.cursor);
  };

  const submit = async () => {
    if (!value.trim() || errors.length > 0 || !parsed.ast) return;
    await add({ source: value.trim(), normalizedSource: parsed.normalizedSource, kind });
    setHistoryIndex(-1);
    onSubmit?.(parsed);
  };

  const applyHelper = (text: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? cursor;
    const end = el?.selectionEnd ?? cursor;
    const next = insertAt(value, start, end, text);
    setValue(next.value);
    setCursor(next.cursor);
    focusAt(next.cursor);
  };

  const navigateHistory = (direction: 1 | -1) => {
    if (!history.length) return;
    const nextIndex = Math.max(-1, Math.min(history.length - 1, historyIndex + direction));
    setHistoryIndex(nextIndex);
    if (nextIndex >= 0) {
      const nextValue = history[nextIndex].source;
      setValue(nextValue);
      setCursor(nextValue.length);
      focusAt(nextValue.length);
    }
  };

  return (
    <section className="input-zone" aria-labelledby="input-title">
      <div className="input-zone-heading">
        <span className="section-kicker" id="input-title">Universal input</span>
        <div className="input-utility-actions">
          {history.length > 0 && <button onClick={() => void clear()}>Clear history</button>}
          {latex && <button onClick={() => void navigator.clipboard?.writeText(latex)}>Copy LaTeX</button>}
        </div>
      </div>

      <div className={`math-input-shell ${firstError ? 'has-error' : ''}`}>
        <span className="input-prefix">∑</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setCursor(event.target.selectionStart ?? event.target.value.length);
            setHistoryIndex(-1);
          }}
          onSelect={(event) => setCursor(event.currentTarget.selectionStart ?? value.length)}
          onKeyDown={(event) => {
            if (suggestions.length > 0 && (event.key === 'Tab' || (event.key === 'Enter' && !event.ctrlKey && !event.metaKey))) {
              event.preventDefault();
              commitSuggestion(suggestions[suggestionIndex] ?? suggestions[0]);
              return;
            }
            if (suggestions.length > 0 && event.key === 'ArrowDown') {
              event.preventDefault();
              setSuggestionIndex((index) => (index + 1) % suggestions.length);
              return;
            }
            if (suggestions.length > 0 && event.key === 'ArrowUp') {
              event.preventDefault();
              setSuggestionIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
              return;
            }
            if (event.key === 'ArrowUp' && event.currentTarget.selectionStart === 0) {
              event.preventDefault();
              navigateHistory(1);
              return;
            }
            if (event.key === 'ArrowDown' && event.currentTarget.selectionStart === value.length && historyIndex >= 0) {
              event.preventDefault();
              navigateHistory(-1);
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }}
          onPaste={(event) => {
            // Normal paste is preserved. The parser's normalizer handles common
            // LaTeX such as \\frac, \\sqrt, \\pi, \\cdot and \\left/\\right.
            setCursor((event.currentTarget.selectionStart ?? 0) + event.clipboardData.getData('text').length);
          }}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={Boolean(firstError)}
          aria-describedby={firstError ? 'math-input-diagnostic' : 'math-input-status'}
          aria-label="Mathematical input"
        />
        <button className="run-button" onClick={() => void submit()} disabled={Boolean(firstError) || !parsed.ast}>Commit <span>→</span></button>

        {suggestions.length > 0 && (
          <div className="math-suggestions" role="listbox" aria-label="Mathematical input suggestions">
            {suggestions.map((suggestion, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index === suggestionIndex}
                className={index === suggestionIndex ? 'is-active' : ''}
                key={suggestion.label}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commitSuggestion(suggestion)}
              >
                <span>{suggestion.label}</span><small>{suggestion.detail}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="math-helper-row" aria-label="Mathematical input helpers">
        {helpers.map((helper) => <button key={helper.label} onClick={() => applyHelper(helper.text)}>{helper.label}</button>)}
        <span className="helper-note">Use := for explicit definitions · LaTeX paste · Enter commits</span>
      </div>

      <div className="live-preview-panel">
        <div className="preview-meta">
          <span>Live preview</span>
          <span>{labels[kind]}{parsed.normalizedSource !== value ? ' · LaTeX normalized' : ''}</span>
        </div>
        <MathPreview ast={errors.length ? null : parsed.ast} fallback={value.trim() ? 'Fix the input diagnostic to restore the preview.' : 'Enter mathematics to preview it.'} />
      </div>

      {firstError ? (
        <div className="input-diagnostic" id="math-input-diagnostic" role="alert">
          <span className="diagnostic-badge">Input</span>
          <div>
            <strong>{firstError.message}</strong>
            <code>{parsed.normalizedSource || value}</code>
            <span className="diagnostic-pointer" style={{ '--pointer-offset': `${Math.max(0, firstError.start)}ch` } as CSSProperties}>↑</span>
          </div>
        </div>
      ) : (
        <div className="input-status" id="math-input-status">
          <span className="status-dot" /> {labels[kind]} recognized · {Math.max(0, parsed.tokens.length - 1)} tokens · AST ready
        </div>
      )}
    </section>
  );
}
