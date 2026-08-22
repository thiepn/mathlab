import { useEffect, useState } from 'react';
import type { MathResult } from '../../lib/math/types';
import { astToLatex, astToPlainText } from '../../lib/math/format';
import { MathValue } from './MathValue';

interface AlgebraResultProps {
  result: MathResult | null;
  status: 'idle' | 'running' | 'error' | 'done';
  error?: string;
  onClear?: () => void;
}

const operationLabels: Record<string, string> = {
  'inspect-exact': 'Exact form', 'inspect-decimal': 'Decimal form', simplify: 'Simplify', expand: 'Expand', factor: 'Factor',
  'polynomial-division': 'Polynomial division', 'partial-fractions': 'Partial fractions', solve: 'Solve equation',
  'solve-inequality': 'Solve inequality', 'solve-system': 'Solve linear system', substitute: 'Substitute',
  'evaluate-function': 'Evaluate function', differentiate: 'Derivative', derivative: 'Derivative', 'higher-derivative': 'Higher derivative',
  integrate: 'Antiderivative', 'definite-integral': 'Definite integral', limit: 'Limit', zeros: 'Zeros',
  'critical-points': 'Critical points', extrema: 'Extrema', monotonicity: 'Monotonicity', concavity: 'Concavity',
  'function-profile': 'Function profile',
  'evaluate-linear-algebra': 'Exact linear algebra', norm: 'Euclidean norm', 'dot-product': 'Dot product',
  rref: 'Reduced row echelon form', rank: 'Rank', det: 'Determinant', inverse: 'Inverse',
  'solve-augmented': 'Augmented system', 'column-space': 'Column-space basis', 'null-space': 'Null-space basis',
  'row-space': 'Row-space basis', 'linear-profile': 'Linear algebra profile', 'span-vector': 'Span profile',
  transpose: 'Transpose', 'conjugate-transpose': 'Conjugate transpose', projection: 'Orthogonal projection',
  'project-column-space': 'Column-space projection', 'orthogonality-profile': 'Orthogonality profile',
  'gram-schmidt': 'Gram–Schmidt', qr: 'QR decomposition', 'least-squares': 'Least squares',
  'characteristic-polynomial': 'Characteristic polynomial', eigen: 'Eigenvalues', eigenspaces: 'Eigenspaces',
  diagonalize: 'Diagonalization', 'symmetry-profile': 'Symmetric / Hermitian profile',
  'descriptive-statistics': 'Descriptive statistics', 'evaluate-probability': 'Exact probability',
  'distribution-profile': 'Distribution profile', 'distribution-probability': 'Distribution probability',
  'distribution-quantile': 'Distribution quantile', 'sampling-mean-profile': 'Sampling distribution',
  'simulate-distribution': 'Distribution simulation', 'mean-confidence-interval': 'Mean confidence interval',
  'mean-hypothesis-test': 'One-sample mean test', 'proportion-confidence-interval': 'Proportion confidence interval',
  'proportion-hypothesis-test': 'One-proportion test', 'correlation-regression': 'Correlation & regression',
  'verify-transition': 'Verify transformation', 'verify-chain': 'Verify work chain', 'verify-entailment': 'Logic entailment', verify: 'Check solution',
};

export function AlgebraResult({ result, status, error, onClear }: AlgebraResultProps) {
  const [view, setView] = useState<'answer' | 'steps'>('answer');
  useEffect(() => setView('answer'), [result?.id]);
  if (status === 'idle' && !result) return null;
  return (
    <section className="algebra-result" aria-live="polite">
      <div className="result-heading algebra-result-heading">
        <div><span className="section-kicker">MathLab local mathematics engine</span><strong>{result ? operationLabels[result.operation] ?? result.operation : status === 'running' ? 'Computing' : 'Could not compute'}</strong></div>
        <div className="result-view-controls">
          {result && <><button className={view === 'answer' ? 'is-active' : ''} onClick={() => setView('answer')}>Answer</button><button className={view === 'steps' ? 'is-active' : ''} onClick={() => setView('steps')}>Steps <span>{result.steps.length}</span></button>{result.resultAst && <button onClick={() => void navigator.clipboard?.writeText(astToPlainText(result.resultAst!))}>Copy</button>}{result.resultAst && <button onClick={() => void navigator.clipboard?.writeText(astToLatex(result.resultAst!))}>LaTeX</button>}</>}
          {onClear && <button onClick={onClear}>Clear</button>}
        </div>
      </div>

      {status === 'running' && <div className="engine-running"><span />Executing deterministic mathematics in the MathLab worker…</div>}
      {status === 'error' && <div className="engine-error"><strong>Not available for this input.</strong><p>{error}</p></div>}

      {result && view === 'answer' && (
        <div className="answer-shell">
          <div className="answer-surface">
            <div className="answer-math"><MathValue ast={result.resultAst} source={result.display || 'No symbolic result.'} compact={false} /></div>
            <div className="answer-meta">
              <span>{result.exactness === 'exact' ? 'EXACT' : result.exactness === 'approximate' ? 'APPROX.' : result.exactness.toUpperCase()}</span>
              <span>{result.assumptions.length ? `${result.assumptions.length} assumption${result.assumptions.length === 1 ? '' : 's'}` : 'No added assumptions'}</span>
            </div>
            {result.warnings.map((warning) => <div className="result-warning" key={warning}>{warning}</div>)}
          </div>

          {result.sections?.length ? (
            <div className="result-sections">
              {result.sections.map((section) => (
                <section className="result-section" key={section.id}>
                  <div className="result-section-heading"><strong>{section.title}</strong>{section.description && <p>{section.description}</p>}</div>
                  <div className="result-facts">
                    {section.facts.map((fact, index) => (
                      <div className={`result-fact fact-${fact.tone ?? 'neutral'}`} key={`${section.id}:${fact.label}:${index}`}>
                        <span className="result-fact-label"><MathValue source={fact.label} compact /></span>
                        <strong className="result-fact-value"><MathValue ast={fact.ast} source={fact.display} compact /></strong>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {result && view === 'steps' && (
        <div className="derivation-list">
          {result.steps.length === 0 ? <div className="derivation-empty">No transformation steps were required or the result is a direct structured analysis.</div> : result.steps.map((step, index) => (
            <article className="derivation-step" key={step.id}>
              <div className="step-index">{String(index + 1).padStart(2, '0')}</div>
              <div className="step-body">
                <div className="step-rule"><strong>{step.rule.replace(/-/g, ' ')}</strong><span className={step.verificationStatus ?? (step.verified ? 'verified' : '')}>{step.verificationStatus ? step.verificationStatus.replace(/-/g, ' ') : step.verified ? 'verified' : 'unchecked'}</span></div>
                {step.explanation && <p>{step.explanation}</p>}
                <div className="step-transition">
                  <div><span>Before</span><MathValue ast={step.beforeAst} source={step.before} compact /></div>
                  <div className="transition-arrow">→</div>
                  <div><span>After</span><MathValue ast={step.afterAst} source={step.after} compact /></div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
