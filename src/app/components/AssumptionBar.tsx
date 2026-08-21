import { useState } from 'react';
import type { MathAssumption, SemanticDiagnostic } from '../../lib/math/types';

interface AssumptionBarProps {
  assumptions: MathAssumption[];
  diagnostics: SemanticDiagnostic[];
  onAdd: (source: string) => { diagnostics: SemanticDiagnostic[] };
  onRemove: (id: string) => void;
}

export function AssumptionBar({ assumptions, diagnostics, onAdd, onRemove }: AssumptionBarProps) {
  const [value, setValue] = useState('');
  const [localError, setLocalError] = useState('');

  const submit = () => {
    const source = value.trim();
    if (!source) return;
    const result = onAdd(source);
    const error = result.diagnostics.find((item) => item.severity === 'error');
    if (error) { setLocalError(error.message); return; }
    setValue('');
    setLocalError('');
  };

  return (
    <section className="assumption-strip" aria-labelledby="assumption-title">
      <div className="assumption-heading">
        <div><span className="section-kicker" id="assumption-title">Assumptions</span><small>Optional semantic context</small></div>
        <div className="assumption-entry">
          <input
            value={value}
            onChange={(event) => { setValue(event.target.value); setLocalError(''); }}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }}
            placeholder="x > 0 · n integer · A symmetric"
            aria-label="Add mathematical assumption"
          />
          <button onClick={submit}>Add</button>
        </div>
      </div>
      {(assumptions.length > 0 || localError || diagnostics.length > 0) && (
        <div className="assumption-body">
          <div className="assumption-list">
            {assumptions.map((item) => (
              <button key={item.id} className="assumption-chip" onClick={() => onRemove(item.id)} title="Remove assumption">
                {item.label}<span>×</span>
              </button>
            ))}
          </div>
          {(localError || diagnostics[0]) && <div className="assumption-warning">{localError || diagnostics[0].message}</div>}
        </div>
      )}
    </section>
  );
}
