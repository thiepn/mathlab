export function Logo() {
  return (
    <div className="brand" aria-label="MathLab">
      <svg className="brand__mark" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M8 12 32 5l24 7v40l-24 7-24-7V12Z" />
        <path d="m8 12 24 20 24-20M8 52l24-20 24 20M32 5v54" />
      </svg>
      <span className="brand__name">MathLab</span>
    </div>
  );
}
