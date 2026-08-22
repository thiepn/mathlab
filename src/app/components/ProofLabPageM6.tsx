import { useEffect, useMemo, useRef, useState } from 'react';
import type { MathResult } from '../../lib/math/types';
import { MathWorkerClient } from '../../lib/worker/client';
import { PROOF_OUTCOME_COPY, proofOutcome, type ProofOutcome } from '../learningSurfaces';
import { AlgebraResult } from './AlgebraResult';
import { MathLinesPreview } from './MathLinesPreview';
import { MathValue } from './MathValue';

type ProofMode = 'transition' | 'chain' | 'entailment';

interface ProofLabPageProps { initialSource?: string; }

const MODE_COPY: Record<ProofMode, { label: string; short: string; description: string }> = {
  transition: { label: 'One step', short: 'A → B', description: 'Check whether one written transformation preserves the mathematical object or solution set.' },
  chain: { label: 'Derivation', short: 'A → … → Z', description: 'Verify every adjacent line in a worked derivation and combine the verdicts.' },
  entailment: { label: 'Logic', short: 'P ⊨ Q', description: 'Check propositional entailment exhaustively and return a countermodel when one exists.' },
};

function ProofOutcomePanel({ outcome, result, status }: { outcome: ProofOutcome; result: MathResult | null; status: 'idle' | 'running' | 'error' | 'done' }) {
  const copy = PROOF_OUTCOME_COPY[outcome];
  const transitionCount = result?.steps.length ?? 0;
  const conditions = result?.sections?.flatMap((section) => section.facts.filter((fact) => /condition|assumption/i.test(fact.label)).map((fact) => fact.display)) ?? [];
  return (
    <aside className={`m6-proof-outcome outcome-${outcome}`}>
      <span className="section-kicker">Verification status</span>
      <div className="m6-proof-status-mark" aria-hidden="true"><i /></div>
      <h2>{status === 'running' ? 'Verifying…' : copy.label}</h2>
      <p>{status === 'running' ? 'MathLab is applying exact supported rules in the local worker.' : copy.description}</p>
      {result && <dl><div><dt>Exactness</dt><dd>{result.exactness}</dd></div><div><dt>Checked steps</dt><dd>{transitionCount}</dd></div><div><dt>Warnings</dt><dd>{result.warnings.length}</dd></div></dl>}
      {conditions.length > 0 && <div className="m6-proof-conditions"><span>Required conditions</span>{conditions.slice(0, 6).map((condition, index) => <MathValue key={`${condition}:${index}`} source={condition} compact />)}</div>}
      <small>Matching numerical samples never upgrade a claim to verified.</small>
    </aside>
  );
}

export function ProofLabPage({ initialSource = '' }: ProofLabPageProps) {
  const [mode, setMode] = useState<ProofMode>('transition');
  const [before, setBefore] = useState(initialSource || '2*x + 2 = 6');
  const [after, setAfter] = useState('x = 2');
  const [assumptions, setAssumptions] = useState('');
  const [chain, setChain] = useState(initialSource ? `${initialSource}\n` : '2*x + 2 = 6\n2*x = 4\nx = 2');
  const [premises, setPremises] = useState('implies(p,q)\np');
  const [conclusion, setConclusion] = useState('q');
  const [result, setResult] = useState<MathResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'error' | 'done'>('idle');
  const [error, setError] = useState('');
  const worker = useRef<MathWorkerClient | null>(null);

  useEffect(() => () => worker.current?.dispose(), []);
  useEffect(() => {
    if (!initialSource) return;
    setBefore(initialSource);
    setChain(`${initialSource}\n`);
  }, [initialSource]);

  const outcome = useMemo(() => proofOutcome(result), [result]);
  const chainLines = useMemo(() => chain.split(/\r?\n/).map((line) => line.trim()).filter(Boolean), [chain]);
  const premiseLines = useMemo(() => premises.split(/\r?\n/).map((line) => line.trim()).filter(Boolean), [premises]);

  const clear = () => { setResult(null); setStatus('idle'); setError(''); };
  const changeMode = (next: ProofMode) => { setMode(next); clear(); };

  const run = async () => {
    if (!worker.current) worker.current = new MathWorkerClient();
    setStatus('running'); setError(''); setResult(null);
    try {
      const id = `proof-${Date.now()}`;
      const next = mode === 'transition'
        ? await worker.current.execute({ id, operation: 'verify-transition', input: before.trim(), options: { next: after.trim(), proofAssumptions: assumptions.trim() } })
        : mode === 'chain'
          ? await worker.current.execute({ id, operation: 'verify-chain', input: chainLines[0] || '0', options: { work: chain, proofAssumptions: assumptions.trim() } })
          : await worker.current.execute({ id, operation: 'verify-entailment', input: conclusion.trim(), options: { premises, conclusion: conclusion.trim() } });
      setResult(next); setStatus('done');
    } catch (caught) {
      setStatus('error'); setError(caught instanceof Error ? caught.message : 'Proof Lab could not verify this work.');
    }
  };

  const canRun = mode === 'transition'
    ? Boolean(before.trim() && after.trim())
    : mode === 'chain'
      ? chainLines.length >= 2
      : Boolean(premiseLines.length && conclusion.trim());

  return (
    <main className="workspace proof-lab-page m6-proof-page">
      <section className="m6-proof-hero">
        <div><span className="section-kicker">Proof Lab</span><h1>Check the reasoning, not only the final answer.</h1><p>MathLab separates exact certification, conditional validity, counterexamples and unsupported proof obligations instead of treating plausible algebra as proof.</p></div>
        <div className="m6-proof-status-key" aria-label="Verification status key"><span className="verified"><i />Verified</span><span className="conditional"><i />Conditional</span><span className="invalid"><i />Invalid</span><span className="unknown"><i />Not proven</span></div>
      </section>

      <nav className="m6-proof-modes" aria-label="Proof Lab mode">
        {(Object.keys(MODE_COPY) as ProofMode[]).map((item) => <button key={item} className={mode === item ? 'is-active' : ''} onClick={() => changeMode(item)}><strong>{MODE_COPY[item].label}</strong><span>{MODE_COPY[item].short}</span><small>{MODE_COPY[item].description}</small></button>)}
      </nav>

      <div className="m6-proof-workbench">
        <section className="m6-proof-editor">
          <header><div><span className="section-kicker">{MODE_COPY[mode].label}</span><h2>{mode === 'transition' ? 'Proposed transformation' : mode === 'chain' ? 'Worked derivation' : 'Premises and conclusion'}</h2></div><button onClick={clear} disabled={!result && status === 'idle'}>Clear result</button></header>

          {mode === 'transition' && (
            <>
              <div className="m6-transition-editor">
                <label><span>Before</span><textarea value={before} onChange={(event) => setBefore(event.target.value)} rows={4} spellCheck={false} /><div className="m6-proof-preview"><MathLinesPreview source={before} label="Rendered current line" /></div></label>
                <div className="m6-proof-arrow" aria-hidden="true">→</div>
                <label><span>Proposed next line</span><textarea value={after} onChange={(event) => setAfter(event.target.value)} rows={4} spellCheck={false} /><div className="m6-proof-preview"><MathLinesPreview source={after} label="Rendered proposed line" /></div></label>
              </div>
              <label className="m6-assumption-editor"><span>Assumptions <small>optional · one per line or separated by ;</small></span><textarea value={assumptions} onChange={(event) => setAssumptions(event.target.value)} rows={2} placeholder="x != 0" spellCheck={false} />{assumptions.trim() && <div className="m6-proof-preview"><MathLinesPreview source={assumptions} label="Rendered assumptions" /></div>}</label>
            </>
          )}

          {mode === 'chain' && (
            <>
              <div className="m6-chain-editor">
                <label><span>Derivation <small>one mathematical line per step</small></span><textarea value={chain} onChange={(event) => setChain(event.target.value)} rows={10} spellCheck={false} /></label>
                <div className="m6-chain-preview"><span className="section-kicker">Rendered chain</span>{chainLines.length ? chainLines.map((line, index) => <div key={`${line}:${index}`}><span>{String(index + 1).padStart(2, '0')}</span><MathValue source={line} compact={false} forceMathStyle /></div>) : <p>Add at least two mathematical lines.</p>}</div>
              </div>
              <label className="m6-assumption-editor"><span>Assumptions <small>carried through the full chain</small></span><textarea value={assumptions} onChange={(event) => setAssumptions(event.target.value)} rows={2} placeholder="x != 0" spellCheck={false} /></label>
            </>
          )}

          {mode === 'entailment' && (
            <div className="m6-entailment-editor">
              <label><span>Premises <small>one per line</small></span><textarea value={premises} onChange={(event) => setPremises(event.target.value)} rows={7} spellCheck={false} /><div className="m6-proof-preview"><MathLinesPreview source={premises} label="Rendered premises" /></div></label>
              <div className="m6-entailment-symbol" aria-hidden="true">⊨</div>
              <label><span>Conclusion</span><textarea value={conclusion} onChange={(event) => setConclusion(event.target.value)} rows={7} spellCheck={false} /><div className="m6-proof-preview"><MathLinesPreview source={conclusion} label="Rendered conclusion" /></div></label>
            </div>
          )}

          <div className="m6-proof-actions"><button className="primary-action" disabled={status === 'running' || !canRun} onClick={() => void run()}>{status === 'running' ? 'Verifying…' : mode === 'entailment' ? 'Check entailment' : mode === 'chain' ? 'Verify derivation' : 'Verify step'}</button><span>Exact rules certify · bounded evaluation only searches for counterexamples</span></div>
          {status === 'error' && <div className="engine-error m6-proof-error"><strong>Verification could not run.</strong><p>{error}</p></div>}
        </section>

        <ProofOutcomePanel outcome={status === 'error' ? 'not-proven' : outcome} result={result} status={status} />
      </div>

      {result && <section className="m6-proof-result"><AlgebraResult result={result} status={status} error={error} onClear={clear} /></section>}

      <section className="m6-proof-principles">
        <article><span>01</span><div><strong>Exact certification</strong><p>Supported identities, equation and inequality solution sets, linear systems and exhaustive truth tables can be certified exactly.</p></div></article>
        <article><span>02</span><div><strong>Assumptions stay visible</strong><p>Domain-changing cancellation is marked conditional unless the missing nonzero condition is explicitly carried.</p></div></article>
        <article><span>03</span><div><strong>Counterexamples disprove</strong><p>A concrete counterexample is enough to reject a universal claim. Failure to find one is never promoted to proof.</p></div></article>
      </section>
    </main>
  );
}
