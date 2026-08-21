import { useEffect, useRef, useState } from 'react';
import type { MathResult } from '../../lib/math/types';
import { MathWorkerClient } from '../../lib/worker/client';
import { AlgebraResult } from './AlgebraResult';

type ProofMode = 'transition' | 'chain' | 'entailment';

interface ProofLabPageProps { initialSource?: string; }

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

  const clear = () => { setResult(null); setStatus('idle'); setError(''); };

  const run = async () => {
    if (!worker.current) worker.current = new MathWorkerClient();
    setStatus('running'); setError(''); setResult(null);
    try {
      const id = `proof-${Date.now()}`;
      const next = mode === 'transition'
        ? await worker.current.execute({ id, operation:'verify-transition', input:before.trim(), options:{ next:after.trim(), proofAssumptions:assumptions.trim() } })
        : mode === 'chain'
          ? await worker.current.execute({ id, operation:'verify-chain', input:chain.split(/\r?\n/).find((line) => line.trim())?.trim() || '0', options:{ work:chain, proofAssumptions:assumptions.trim() } })
          : await worker.current.execute({ id, operation:'verify-entailment', input:conclusion.trim(), options:{ premises, conclusion:conclusion.trim() } });
      setResult(next); setStatus('done');
    } catch (caught) {
      setStatus('error'); setError(caught instanceof Error ? caught.message : 'Proof Lab could not verify this work.');
    }
  };

  return (
    <main className="workspace proof-lab-page">
      <section className="proof-lab-hero">
        <div>
          <span className="section-kicker">Deterministic verification</span>
          <h1>Verify My Work &amp; Proof Lab</h1>
          <p>Check whether a transformation is actually reversible, whether a domain restriction was lost, or whether a logical conclusion follows. A matching sample is never treated as proof; a counterexample can still disprove a claim.</p>
        </div>
        <div className="proof-status-key" aria-label="Verification status key">
          <span className="proof-key verified">Verified</span>
          <span className="proof-key conditional">Conditional</span>
          <span className="proof-key invalid">Invalid</span>
          <span className="proof-key unknown">Not proven</span>
        </div>
      </section>

      <section className="proof-lab-card">
        <div className="proof-mode-tabs" role="tablist" aria-label="Proof Lab mode">
          <button className={mode === 'transition' ? 'is-active' : ''} onClick={() => { setMode('transition'); clear(); }}>Check one step</button>
          <button className={mode === 'chain' ? 'is-active' : ''} onClick={() => { setMode('chain'); clear(); }}>Check a chain</button>
          <button className={mode === 'entailment' ? 'is-active' : ''} onClick={() => { setMode('entailment'); clear(); }}>Logic entailment</button>
        </div>

        {mode === 'transition' && (
          <div className="proof-form-grid">
            <label><span>Before</span><textarea value={before} onChange={(event) => setBefore(event.target.value)} rows={3} spellCheck={false} /></label>
            <label><span>Proposed next line</span><textarea value={after} onChange={(event) => setAfter(event.target.value)} rows={3} spellCheck={false} /></label>
            <label className="proof-wide"><span>Assumptions · one per line or separated by ;</span><textarea value={assumptions} onChange={(event) => setAssumptions(event.target.value)} rows={2} placeholder="x != 0" spellCheck={false} /></label>
          </div>
        )}

        {mode === 'chain' && (
          <div className="proof-form-grid single-column">
            <label><span>Work · one mathematical line per step</span><textarea value={chain} onChange={(event) => setChain(event.target.value)} rows={9} spellCheck={false} /></label>
            <label><span>Assumptions · carried through the full chain</span><textarea value={assumptions} onChange={(event) => setAssumptions(event.target.value)} rows={2} placeholder="x != 0" spellCheck={false} /></label>
          </div>
        )}

        {mode === 'entailment' && (
          <div className="proof-form-grid">
            <label><span>Premises · one per line</span><textarea value={premises} onChange={(event) => setPremises(event.target.value)} rows={6} spellCheck={false} /></label>
            <label><span>Conclusion</span><textarea value={conclusion} onChange={(event) => setConclusion(event.target.value)} rows={6} spellCheck={false} /></label>
          </div>
        )}

        <div className="proof-lab-actions">
          <button className="primary-action" disabled={status === 'running'} onClick={() => void run()}>{status === 'running' ? 'Verifying…' : mode === 'entailment' ? 'Check entailment' : 'Verify work'}</button>
          <span>Exact rules certify. Bounded evaluation is used only to produce counterexamples.</span>
        </div>
      </section>

      <AlgebraResult result={result} status={status} error={error} onClear={clear} />

      <section className="proof-boundaries">
        <article><strong>Exact certification</strong><p>Polynomial/rational identities, supported equation and inequality solution sets, linear-system equivalence, and exhaustive propositional truth tables.</p></article>
        <article><strong>Assumption tracking</strong><p>Cancelling or introducing a factor can be marked conditionally valid with the required nonzero condition instead of being accepted unconditionally.</p></article>
        <article><strong>Counterexamples</strong><p>If an exact proof rule is unavailable, bounded evaluation may find a concrete counterexample. Failure to find one remains “not proven.”</p></article>
      </section>
    </main>
  );
}
