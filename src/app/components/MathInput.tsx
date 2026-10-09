import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { ParsedMath } from '../../lib/math/ast';
import { classifyParsed } from '../../lib/math/classify';
import { astToLatex } from '../../lib/math/format';
import {
  MATH_INPUT_TEMPLATES,
  applyInputTemplate,
  applyOpeningDelimiter,
  nextInputBoundary,
  removeEmptyDelimiterPair,
  skipClosingDelimiter,
  type InputEdit,
  type MathInputTemplate,
} from '../../lib/math/inputEditing';
import { parseMath } from '../../lib/math/parser';
import { applySuggestion, getMathSuggestions, type MathSuggestion } from '../../lib/math/suggestions';
import { useInputHistory } from '../hooks/useInputHistory';
import { MathKeypad } from './MathKeypad';
import { MathPreview } from './MathPreview';

interface MathInputProps {
  initialValue?: string;
  canSubmit?: boolean;
  onChangeParsed?: (parsed: ParsedMath) => void;
  onSubmit?: (parsed: ParsedMath) => void;
}

const labels = {
  scalar: 'Scalar', expression: 'Expression', equation: 'Equation', inequality: 'Inequality', system: 'System', function: 'Function',
  vector: 'Vector', matrix: 'Matrix', sequence: 'Sequence', dataset: 'Dataset', distribution: 'Distribution', probability: 'Probability',
  proposition: 'Proposition', 'finite-set': 'Finite set', relation: 'Relation', graph: 'Graph', recurrence: 'Recurrence', complexity: 'Complexity', combinatorics: 'Combinatorics', ode: 'ODE IVP',
  pde: 'PDE problem', 'finite-group': 'Finite group', 'finite-ring': 'Finite ring', homomorphism: 'Group homomorphism',
  'metric-space': 'Metric space', topology: 'Topology', 'point-set': 'Point set', geometry: 'Geometry object',
  unknown: 'Unresolved input',
};

const quickTemplateIds = ['pi', 'sqrt', 'square', 'paren', 'definition', 'lte', 'gte'] as const;
const quickTemplates = quickTemplateIds
  .map((id) => MATH_INPUT_TEMPLATES.find((template) => template.id === id))
  .filter((template): template is MathInputTemplate => Boolean(template));

export function MathInput({ initialValue = '', canSubmit = true, onChangeParsed, onSubmit }: MathInputProps) {
  const [value, setValue] = useState(initialValue);
  const [cursor, setCursor] = useState(initialValue.length);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeParsedRef = useRef(onChangeParsed);
  const { history, add, clear } = useInputHistory();

  const parsed = useMemo(() => parseMath(value), [value]);
  const kind = useMemo(() => classifyParsed(parsed), [parsed]);
  const errors = parsed.diagnostics.filter((item) => item.severity === 'error');
  const firstError = errors[0];
  const suggestions = useMemo(() => getMathSuggestions(value, cursor), [value, cursor]);
  const latex = parsed.ast && errors.length === 0 ? astToLatex(parsed.ast) : '';

  useEffect(() => { onChangeParsedRef.current = onChangeParsed; }, [onChangeParsed]);
  useEffect(() => onChangeParsedRef.current?.(parsed), [parsed]);
  useEffect(() => {
    setValue(initialValue);
    setCursor(initialValue.length);
    setHistoryIndex(-1);
  }, [initialValue]);
  useEffect(() => setSuggestionIndex(0), [value]);

  const focusSelection = (start: number, end = start) => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(start, end);
    });
  };

  const applyEdit = (edit: InputEdit) => {
    setValue(edit.value);
    setCursor(edit.start);
    setHistoryIndex(-1);
    focusSelection(edit.start, edit.end);
  };

  const currentSelection = () => {
    const element = inputRef.current;
    return {
      start: element?.selectionStart ?? cursor,
      end: element?.selectionEnd ?? cursor,
    };
  };

  const applyTemplate = (template: MathInputTemplate) => {
    const { start, end } = currentSelection();
    applyEdit(applyInputTemplate(value, start, end, template));
  };

  const commitSuggestion = (suggestion: MathSuggestion) => {
    const next = applySuggestion(value, cursor, suggestion);
    applyEdit({ value: next.value, start: next.cursor, end: next.cursor });
  };

  const submit = () => {
    if (!canSubmit || !value.trim() || errors.length > 0 || !parsed.ast) return;
    // Committing mathematical work must not wait for optional input-history I/O.
    // Otherwise a quick route change can unmount the editor before the commit runs.
    onSubmit?.(parsed);
    setHistoryIndex(-1);
    void add({ source: value.trim(), normalizedSource: parsed.normalizedSource, kind });
  };

  const navigateHistory = (direction: 1 | -1) => {
    if (!history.length) return;
    const nextIndex = Math.max(-1, Math.min(history.length - 1, historyIndex + direction));
    setHistoryIndex(nextIndex);
    if (nextIndex >= 0) {
      const nextValue = history[nextIndex].source;
      setValue(nextValue);
      setCursor(nextValue.length);
      focusSelection(nextValue.length);
    }
  };

  return (
    <section className="input-zone" aria-labelledby="input-title">
      <div className="input-zone-heading">
        <span className="section-kicker" id="input-title">Universal input</span>
        <div className="input-utility-actions">
          {history.length > 0 && <button type="button" onClick={() => void clear()}>Clear history</button>}
          {latex && <button type="button" onClick={() => void navigator.clipboard?.writeText(latex)}>Copy LaTeX</button>}
        </div>
      </div>

      <div className="math-entry-composition">
        <div className="math-entry-editor">
      <div className={`math-input-shell ${firstError ? 'has-error' : ''}`}>
        <span className="input-prefix" aria-hidden="true">∑</span>
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
            const element = event.currentTarget;
            const start = element.selectionStart ?? cursor;
            const end = element.selectionEnd ?? start;

            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              void submit();
              return;
            }

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

            if (event.key === '(' || event.key === '[') {
              event.preventDefault();
              applyEdit(applyOpeningDelimiter(value, start, end, event.key));
              return;
            }

            if ((event.key === ')' || event.key === ']') && start === end) {
              const skipped = skipClosingDelimiter(value, start, event.key);
              if (skipped) {
                event.preventDefault();
                applyEdit(skipped);
                return;
              }
            }

            if (event.key === 'Backspace' && start === end) {
              const removed = removeEmptyDelimiterPair(value, start);
              if (removed) {
                event.preventDefault();
                applyEdit(removed);
                return;
              }
            }

            if (event.key === 'Tab') {
              const boundary = nextInputBoundary(value, start);
              if (boundary !== null) {
                event.preventDefault();
                setCursor(Math.min(boundary, value.length));
                focusSelection(Math.min(boundary, value.length));
                return;
              }
            }

            if (event.key === 'Escape' && keypadOpen) {
              event.preventDefault();
              setKeypadOpen(false);
              focusSelection(start, end);
              return;
            }

            if (event.key === 'ArrowUp' && start === 0 && end === 0) {
              event.preventDefault();
              navigateHistory(1);
              return;
            }
            if (event.key === 'ArrowDown' && start === value.length && end === value.length && historyIndex >= 0) {
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
            const start = event.currentTarget.selectionStart ?? 0;
            const end = event.currentTarget.selectionEnd ?? start;
            const text = event.clipboardData.getData('text');
            setCursor(start + text.length - (end - start));
          }}
          spellCheck={false}
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={Boolean(firstError)}
          aria-describedby={firstError ? 'math-input-diagnostic' : 'math-input-status'}
          aria-label="Mathematical input"
        />
        <button
          className="run-button"
          onClick={() => void submit()}
          disabled={!canSubmit || Boolean(firstError) || !parsed.ast}
          title={!canSubmit ? 'Workspace storage is still loading.' : 'Commit mathematics (Ctrl/⌘+Enter)'}
        >
          Commit <span>→</span>
        </button>

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
        {quickTemplates.map((template) => (
          <button
            type="button"
            className="quick-math-key"
            key={template.id}
            onClick={() => applyTemplate(template)}
            aria-label={template.detail}
            title={template.detail}
          >
            {template.label}
          </button>
        ))}
        <button
          type="button"
          className={`math-keypad-toggle ${keypadOpen ? 'is-active' : ''}`}
          onClick={() => setKeypadOpen((open) => !open)}
          aria-expanded={keypadOpen}
          aria-controls="math-keypad-panel"
        >
          Math keypad
        </button>
        <span className="helper-note">
          {canSubmit
            ? 'Select text to wrap · Tab jumps through structure · Ctrl/⌘+Enter commits'
            : 'Workspace storage is loading · editing is available; Commit unlocks when ready'}
        </span>
      </div>

      <div id="math-keypad-panel">
        <MathKeypad open={keypadOpen} onClose={() => { setKeypadOpen(false); focusSelection(cursor); }} onTemplate={applyTemplate} />
      </div>

        </div>
      <div className="live-preview-panel">
        <div className="preview-meta">
          <span>Live preview</span>
          <span>{labels[kind]}{parsed.normalizedSource !== value ? ' · syntax normalized' : ''}</span>
        </div>
        <MathPreview ast={errors.length ? null : parsed.ast} fallback={value.trim() ? 'Fix the input diagnostic to restore the preview.' : 'Enter mathematics to preview it.'} />
      </div>
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
