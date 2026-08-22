import { MathValue } from './MathValue';

interface MathRichTextProps {
  text: string;
  className?: string;
}

const FORMULA_FRAGMENT = /(\[\[[^\n]+?\]\]|(?:[A-Za-z][A-Za-z0-9_']*(?:\([^)]*\))?|[A-Za-z0-9_()^*/+\-.]+)\s*(?:=|≠|≤|≥|<|>|→|←)\s*(?:\([^.;!?]*\)|[A-Za-z0-9_()^*/+\-.π∞]+)|(?:Σ|Θ|P|E|Var|Cov)\([^.;!?]*?\)|-?\d+\s*\/\s*-?\d+)/g;

export function MathRichText({ text, className = '' }: MathRichTextProps) {
  const parts = text.split(FORMULA_FRAGMENT).filter((part) => part !== '');
  if (parts.length === 1 && parts[0] === text) return <span className={className}>{text}</span>;
  return (
    <span className={`math-rich-text ${className}`.trim()}>
      {parts.map((part, index) => index % 2 === 1
        ? <MathValue key={`${index}:${part}`} source={part.trim()} compact forceMathStyle />
        : <span key={`${index}:${part}`}>{part}</span>)}
    </span>
  );
}
