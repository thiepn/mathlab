import { useMemo, useState } from 'react';
import { PRACTICE_COURSES } from '../../lib/math/practice';
import { TOOL_CATALOG, TOOL_CATEGORIES, type ToolCatalogItem, type ToolCategory } from '../toolCatalog';
import { courseAccentIndex, toolsForCourse } from '../learningSurfaces';
import { MathValue } from './MathValue';

type ReferenceScope = 'all' | string;

function toolMatches(tool: ToolCatalogItem, query: string): boolean {
  if (!query) return true;
  const haystack = [tool.label, tool.category, tool.phase, tool.description, tool.example, ...tool.aliases, ...tool.objectKinds].join(' ').toLowerCase();
  return haystack.includes(query);
}

function ToolReferenceCard({ tool }: { tool: ToolCatalogItem }) {
  return (
    <article className="m6-reference-tool">
      <header><div><span>{tool.phase}</span><strong>{tool.label}</strong></div><em>{tool.objectKinds.length ? tool.objectKinds.join(' · ') : 'Proof workflow'}</em></header>
      <p>{tool.description}</p>
      <div className="m6-reference-example"><span>Example</span><MathValue source={tool.example} compact={false} forceMathStyle /></div>
      <footer><span>{tool.category}</span><button onClick={() => { window.location.hash = '/tools'; }}>Open Tools</button></footer>
    </article>
  );
}

export function CourseReferencePage() {
  const [scope, setScope] = useState<ReferenceScope>('all');
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const selectedCourse = PRACTICE_COURSES.find((course) => course.id === scope);
  const scopedTools = useMemo(() => scope === 'all' ? TOOL_CATALOG : toolsForCourse(scope), [scope]);
  const filteredTools = useMemo(() => scopedTools.filter((tool) => toolMatches(tool, normalizedQuery)), [scopedTools, normalizedQuery]);
  const matchingTopics = useMemo(() => {
    const courses = selectedCourse ? [selectedCourse] : PRACTICE_COURSES;
    return courses.flatMap((course) => course.topics.filter((topic) => !normalizedQuery || `${course.title} ${topic.title} ${topic.description}`.toLowerCase().includes(normalizedQuery)).map((topic) => ({ course, topic })));
  }, [selectedCourse, normalizedQuery]);

  const groupedTools = useMemo(() => TOOL_CATEGORIES.map((category) => ({ category, tools: filteredTools.filter((tool) => tool.category === category) })).filter((group) => group.tools.length), [filteredTools]);
  const activeCount = filteredTools.length + matchingTopics.length;

  return (
    <main className="workspace practice-page reference-page m6-reference-page">
      <section className="m6-reference-hero">
        <div><span className="section-kicker">Mathematical Reference</span><h1>Understand what MathLab knows—and how to use it.</h1><p>Browse the implemented mathematics by course or capability. Every listed operation maps to the same deterministic engine exposed in the Tools catalog.</p></div>
        <div className="m6-reference-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search eigenvalues, Taylor, Bayes, RREF, RK4…" aria-label="Search mathematical reference" />{query && <button onClick={() => setQuery('')}>Clear</button>}</div>
      </section>

      <div className="m6-reference-layout">
        <aside className="m6-reference-nav">
          <span className="section-kicker">Browse</span>
          <button className={scope === 'all' ? 'is-active' : ''} onClick={() => setScope('all')}><span>All capabilities</span><strong>{TOOL_CATALOG.length}</strong></button>
          {PRACTICE_COURSES.map((course) => <button key={course.id} className={`${scope === course.id ? 'is-active' : ''} course-accent-${courseAccentIndex(course.id)}`} onClick={() => setScope(course.id)}><span>{course.title}</span><strong>{toolsForCourse(course.id).length}</strong></button>)}
          <div className="m6-reference-nav-actions"><button onClick={() => { window.location.hash = '/tools'; }}>Open Tools catalog</button><button onClick={() => { window.location.hash = '/practice'; }}>Go to Practice</button></div>
        </aside>

        <div className="m6-reference-content">
          <header className="m6-reference-scope-head">
            <div><span className="section-kicker">{selectedCourse ? selectedCourse.phaseRange : 'P4–P13 capability map'}</span><h2>{selectedCourse?.title ?? 'All mathematical capabilities'}</h2><p>{selectedCourse?.description ?? 'The reference combines the course map with the complete implemented Tools catalog so feature discovery and learning use the same vocabulary.'}</p></div>
            <div><strong>{activeCount}</strong><span>{normalizedQuery ? 'matches' : 'reference entries'}</span></div>
          </header>

          {selectedCourse && matchingTopics.length > 0 && (
            <section className="m6-reference-topics">
              <header><span className="section-kicker">Course concepts</span><strong>{selectedCourse.topics.length} topics</strong></header>
              <div>{matchingTopics.map(({ topic }, index) => <article key={topic.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{topic.title}</strong><p>{topic.description}</p><small>{topic.templateIds.length} generated templates · {topic.authoredIds.length} authored exercises</small></div></article>)}</div>
            </section>
          )}

          {groupedTools.length > 0 ? (
            <section className="m6-reference-tools">
              {groupedTools.map((group: { category: ToolCategory; tools: ToolCatalogItem[] }) => (
                <section key={group.category} className="m6-reference-group">
                  <header><div><span className="section-kicker">Capability group</span><h3>{group.category}</h3></div><strong>{group.tools.length} tool{group.tools.length === 1 ? '' : 's'}</strong></header>
                  <div className="m6-reference-tool-grid">{group.tools.map((tool) => <ToolReferenceCard key={tool.id} tool={tool} />)}</div>
                </section>
              ))}
            </section>
          ) : (
            <section className="m6-reference-empty"><span className="section-kicker">No matches</span><h2>Nothing in this scope matches “{query}”.</h2><p>Try a broader mathematical term or switch to All capabilities.</p><button onClick={() => { setQuery(''); setScope('all'); }}>Show all capabilities</button></section>
          )}

          <section className="m6-reference-boundary"><div><span className="section-kicker">Deterministic boundary</span><strong>Reference claims are limited to what the current engine can actually compute or verify.</strong></div><p>MathLab does not list unsupported mathematics as though it were implemented. M7 will audit the remaining university-math gaps and define the next expansion roadmap.</p></section>
        </div>
      </div>
    </main>
  );
}
