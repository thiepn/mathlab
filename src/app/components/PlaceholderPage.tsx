interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: string;
}

export function PlaceholderPage({ title, description, phase }: PlaceholderPageProps) {
  return (
    <main className="workspace-main placeholder-page">
      <span className="eyebrow">Planned workspace</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="placeholder-rule" />
      <span className="phase-tag">Scheduled for {phase}</span>
    </main>
  );
}
