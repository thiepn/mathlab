import { useMemo, useState } from 'react';
import { PRACTICE_COURSES } from '../../lib/math/practice';
import {
  CAPABILITY_CATEGORIES,
  CAPABILITY_REGISTRY,
  capabilitiesForCourse,
  type CapabilityDescriptor,
} from '../capabilityRegistry';
import type { ToolCategory } from '../toolCatalog';
import { courseAccentIndex } from '../learningSurfaces';
import {
  COMPLETENESS_DOMAINS,
  completenessBreadthPercent,
  domainsByStatus,
  implementedDomainMaturityPercent,
} from '../completenessAudit';
import { MathValue } from './MathValue';

type ReferenceScope = 'all' | string;

function toolMatches(tool: CapabilityDescriptor, query: string): boolean {
  if (!query) return true;
  return tool.searchText.includes(query);
}

function ToolReferenceCard({ tool }: { tool: CapabilityDescriptor }) {
  return (
    <article className="m6-reference-tool">
      <header><div><span>{tool.category}</span><strong>{tool.label}</strong></div><em>{tool.objectKinds.length ? tool.objectKinds.join(' · ') : 'Proof workflow'}</em></header>
      <p>{tool.description}</p>
      <div className="m6-reference-example"><span>Example</span><MathValue source={tool.example} compact={false} forceMathStyle /></div>
      <footer><span>Deterministic capability</span><button onClick={() => { window.location.hash = '/tools'; }}>Open Tools</button></footer>
    </article>
  );
}

export function CourseReferencePage() {
  const [scope, setScope] = useState<ReferenceScope>('all');
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const selectedCourse = PRACTICE_COURSES.find((course) => course.id === scope);
  const scopedTools = useMemo(
    () => scope === 'all' ? CAPABILITY_REGISTRY : capabilitiesForCourse(scope),
    [scope],
  );
  const filteredTools = useMemo(() => scopedTools.filter((tool) => toolMatches(tool, normalizedQuery)), [scopedTools, normalizedQuery]);
  const matchingTopics = useMemo(() => {
    const courses = selectedCourse ? [selectedCourse] : PRACTICE_COURSES;
    return courses.flatMap((course) => course.topics
      .filter((topic) => !normalizedQuery || `${course.title} ${topic.title} ${topic.description}`.toLowerCase().includes(normalizedQuery))
      .map((topic) => ({ course, topic })));
  }, [selectedCourse, normalizedQuery]);

  const groupedTools = useMemo(
    () => CAPABILITY_CATEGORIES
      .map((category) => ({ category, tools: filteredTools.filter((tool) => tool.category === category) }))
      .filter((group) => group.tools.length),
    [filteredTools],
  );
  const activeCount = filteredTools.length + matchingTopics.length;
  const breadth = completenessBreadthPercent();
  const maturity = implementedDomainMaturityPercent();
  const missingCount = domainsByStatus('missing').length;

  return (
    <main className="workspace practice-page reference-page m6-reference-page">
      <section className="m6-reference-hero">
        <div><span className="section-kicker">Mathematical Reference</span><h1>Understand what MathLab knows—and how to use it.</h1><p>Browse the complete stable capability set by mathematical course or topic. Coverage and limitations below are generated from the current deterministic engine rather than historical development phases.</p></div>
        <div className="m6-reference-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search eigenvalues, Taylor, Bayes, SVD, RK45…" aria-label="Search mathematical reference" />{query && <button onClick={() => setQuery('')}>Clear</button>}</div>
      </section>

      {scope === 'all' && !normalizedQuery && (
        <section className="m7-audit-strip" aria-labelledby="coverage-audit-title">
          <div className="m7-audit-summary">
            <div><span className="section-kicker">Current coverage audit</span><h2 id="coverage-audit-title">Breadth is measured separately from maturity.</h2><p>The fixed audit scores 22 broad university-mathematics domains from 0 (missing) to 5 (comprehensive). Only first-class deterministic workflows count toward coverage.</p></div>
            <div className="m7-audit-metric"><strong>{breadth}/100</strong><span>University-domain breadth index</span></div>
            <div className="m7-audit-metric"><strong>{maturity}/100</strong><span>Maturity inside implemented domains</span></div>
          </div>
          <details className="m7-audit-details">
            <summary>Show the 22-domain audit</summary>
            <p>{missingCount === 0 ? 'Every tracked domain now has a first-class workflow, although no domain is yet rated comprehensive.' : `${missingCount} tracked domain${missingCount === 1 ? '' : 's'} remain entirely absent.`} Strongest coverage currently sits in algebra, calculus, linear algebra, probability/statistics, discrete mathematics and numerical analysis.</p>
            <div className="m7-domain-grid">
              {COMPLETENESS_DOMAINS.map((domain) => (
                <article className={`m7-domain-card is-${domain.status}`} key={domain.id}>
                  <header><strong>{domain.title}</strong><span className="m7-domain-level">{domain.level}/5 · {domain.status}</span></header>
                  <div className="m7-domain-meter" aria-label={`${domain.level} of 5 coverage`}>
                    {[1,2,3,4,5].map((value) => <i key={value} className={value <= domain.level ? 'is-filled' : ''} />)}
                  </div>
                  <p>{domain.evidence[0] ?? `Missing: ${domain.gaps.slice(0, 2).join(' · ')}`}</p>
                  <footer><span>{domain.gaps.length} major gap{domain.gaps.length === 1 ? '' : 's'} tracked</span></footer>
                </article>
              ))}
            </div>
          </details>
          <div className="m7-audit-verdict"><span>Audit verdict</span><p><strong>Current class:</strong> broad university computational workbench with selected upper-division verification—not a claim of comprehensive CAS or theorem-prover coverage.</p><a href="#/tools">Explore all tools</a></div>
        </section>
      )}

      <div className="m6-reference-layout">
        <aside className="m6-reference-nav">
          <span className="section-kicker">Browse</span>
          <button className={scope === 'all' ? 'is-active' : ''} onClick={() => setScope('all')}><span>All capabilities</span><strong>{CAPABILITY_REGISTRY.length}</strong></button>
          {PRACTICE_COURSES.map((course) => <button key={course.id} className={`${scope === course.id ? 'is-active' : ''} course-accent-${courseAccentIndex(course.id)}`} onClick={() => setScope(course.id)}><span>{course.title}</span><strong>{capabilitiesForCourse(course.id).length}</strong></button>)}
          <div className="m6-reference-nav-actions"><button onClick={() => { window.location.hash = '/tools'; }}>Open Tools catalog</button><button onClick={() => { window.location.hash = '/practice'; }}>Go to Practice</button></div>
        </aside>

        <div className="m6-reference-content">
          <header className="m6-reference-scope-head">
            <div><span className="section-kicker">{selectedCourse ? 'Course reference' : 'Capability map'}</span><h2>{selectedCourse?.title ?? 'All implemented mathematical capabilities'}</h2><p>{selectedCourse?.description ?? 'This reference is driven from the same complete capability catalog used by MathLab tool discovery.'}</p></div>
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

          <section className="m6-reference-boundary"><div><span className="section-kicker">Deterministic boundary</span><strong>Reference claims are limited to what the current engine can actually compute or verify.</strong></div><p>The current fixed-rubric audit has no entirely missing tracked domain, but several areas remain deliberately partial or narrow. Unsupported mathematics should remain explicit rather than being presented as implemented.</p></section>
        </div>
      </div>
    </main>
  );
}
