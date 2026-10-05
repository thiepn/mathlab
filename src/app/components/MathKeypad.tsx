import { useMemo, useState } from 'react';
import {
  MATH_INPUT_TEMPLATES,
  MATH_KEYPAD_CATEGORIES,
  type MathInputTemplate,
  type MathKeypadCategory,
} from '../../lib/math/inputEditing';

interface MathKeypadProps {
  open: boolean;
  onClose: () => void;
  onTemplate: (template: MathInputTemplate) => void;
}

export function MathKeypad({ open, onClose, onTemplate }: MathKeypadProps) {
  const [category, setCategory] = useState<MathKeypadCategory>('basic');
  const templates = useMemo(
    () => MATH_INPUT_TEMPLATES.filter((template) => template.category === category),
    [category],
  );

  if (!open) return null;

  return (
    <section className="math-keypad" aria-label="Math keypad">
      <header className="math-keypad-heading">
        <div>
          <span className="section-kicker">Math keypad</span>
          <strong>Insert valid MathLab syntax</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close math keypad">Close</button>
      </header>

      <div className="math-keypad-tabs" role="tablist" aria-label="Math keypad categories">
        {MATH_KEYPAD_CATEGORIES.map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={category === item.id}
            className={category === item.id ? 'is-active' : ''}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="math-keypad-grid" role="tabpanel" aria-label={MATH_KEYPAD_CATEGORIES.find((item) => item.id === category)?.label}>
        {templates.map((template) => (
          <button key={template.id} type="button" onClick={() => onTemplate(template)} title={template.detail}>
            <strong>{template.label}</strong>
            <small>{template.detail}</small>
          </button>
        ))}
      </div>

      <footer>
        <span>Tip</span>
        <p>Select existing text before choosing √, x², |x| or parentheses to wrap the selection instead of replacing it.</p>
      </footer>
    </section>
  );
}
