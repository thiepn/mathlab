import { MathValue } from './MathValue';

interface MathLinesPreviewProps {
  source: string;
  label?: string;
}

export function MathLinesPreview({ source, label = 'Rendered mathematics' }: MathLinesPreviewProps) {
  const lines = source.split(/\r?\n|;/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div className="math-lines-preview" aria-label={label}>
      {lines.map((line, index) => (
        <div key={`${index}:${line}`}>
          <span>{lines.length > 1 ? String(index + 1).padStart(2, '0') : '∑'}</span>
          <MathValue source={line} compact={false} forceMathStyle />
        </div>
      ))}
    </div>
  );
}
