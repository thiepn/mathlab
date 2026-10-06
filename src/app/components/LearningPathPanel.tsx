import { useEffect, useMemo, useState } from 'react';
import type { PracticeProgressState } from '../../lib/math/practice';
import {
  LEARNING_STAGES,
  capabilitiesForConcept,
  conceptProgress,
  conceptReadiness,
  conceptsForCourse,
  learningCoverageForCourse,
  recommendedConceptForCourse,
} from '../learningModel';
import { MathRichText } from './MathRichText';

interface LearningPathPanelProps {
  courseId: string;
  progress: PracticeProgressState;
  onStartConcept: (conceptId: string) => void;
  onBrowseTools: () => void;
}

function percentage(value: number): string {
  return String(Math.round(value * 100)) + '%';
}

export function LearningPathPanel({
  courseId,
  progress,
  onStartConcept,
  onBrowseTools,
}: LearningPathPanelProps) {
  const concepts = useMemo(() => conceptsForCourse(courseId), [courseId]);
  const recommended = useMemo(() => recommendedConceptForCourse(courseId, progress), [courseId, progress]);
  const [selectedId, setSelectedId] = useState(recommended?.id ?? concepts[0]?.id ?? '');

  useEffect(() => {
    setSelectedId(recommended?.id ?? concepts[0]?.id ?? '');
  }, [courseId, recommended?.id]);

  const selected = concepts.find((concept) => concept.id === selectedId) ?? concepts[0];
  const selectedProgress = selected ? conceptProgress(progress, selected.id) : null;
  const readiness = selected ? conceptReadiness(progress, selected.id) : null;
  const capabilities = selected ? capabilitiesForConcept(selected.id) : [];
  const coverage = learningCoverageForCourse(courseId);

  if (!selected) return null;

  return (
    <section className="p5-learning-path" aria-label="Course learning pathway">
      <header className="p5-learning-path-header">
        <div>
          <span className="section-kicker">Learning pathway</span>
          <h3>Concepts before question pools</h3>
          <p>Learn the idea, inspect a worked example, practice with guidance, then move to independent review and exams.</p>
        </div>
        <div className="p5-coverage" aria-label={String(coverage.coveredCapabilities) + ' of ' + String(coverage.totalCapabilities) + ' course capabilities covered'}>
          <strong>{coverage.coveredCapabilities}/{coverage.totalCapabilities}</strong>
          <span>engine capabilities mapped</span>
        </div>
      </header>

      <div className="p5-learning-grid">
        <nav className="p5-concept-list" aria-label="Course concepts">
          {concepts.map((concept, index) => {
            const summary = conceptProgress(progress, concept.id);
            const conceptReadinessState = conceptReadiness(progress, concept.id);
            const isRecommended = recommended?.id === concept.id;
            return (
              <button
                key={concept.id}
                type="button"
                className={concept.id === selected.id ? 'is-active' : ''}
                onClick={() => setSelectedId(concept.id)}
                aria-current={concept.id === selected.id ? 'step' : undefined}
              >
                <span className="p5-concept-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="p5-concept-copy">
                  <strong>{concept.title}</strong>
                  <small>
                    {isRecommended ? 'Recommended · ' : ''}
                    {conceptReadinessState.ready ? 'Ready' : 'Prerequisite review'}
                  </small>
                </span>
                <span className="p5-concept-mastery">{summary.seen ? percentage(summary.mastery) : 'New'}</span>
              </button>
            );
          })}
        </nav>

        <article className="p5-concept-detail">
          <div className="p5-stage-strip" aria-label="Learning stages">
            {LEARNING_STAGES.map((stage, index) => (
              <div key={stage.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{stage.label}</strong>
                <small>{stage.description}</small>
              </div>
            ))}
          </div>

          <div className="p5-concept-heading">
            <div>
              <span className="section-kicker">Selected concept</span>
              <h3>{selected.title}</h3>
              <p>{selected.summary}</p>
            </div>
            <div className="p5-concept-score">
              <strong>{selectedProgress?.seen ? percentage(selectedProgress.mastery) : 'New'}</strong>
              <span>{selectedProgress?.attempts ?? 0} attempts</span>
            </div>
          </div>

          <div className="p5-objective-grid">
            <section>
              <span>Learning objective</span>
              <p>{selected.objective}</p>
            </section>
            <section>
              <span>Ready when</span>
              <p>{selected.checkpoint}</p>
            </section>
          </div>

          {!readiness?.ready && readiness && (
            <div className="p5-prerequisite-note">
              <strong>Review first:</strong>{' '}
              {readiness.blockedBy.map((concept) => concept.title).join(', ')}.
              You can still open this concept; MathLab does not hard-lock the course.
            </div>
          )}

          <section className="p5-worked-example">
            <header>
              <div>
                <span className="section-kicker">Worked example</span>
                <h4>{selected.workedExample.title}</h4>
              </div>
              <span>Study before solving</span>
            </header>
            <div className="p5-example-prompt"><MathRichText text={selected.workedExample.prompt} /></div>
            <ol>
              {selected.workedExample.steps.map((step, index) => (
                <li key={selected.id + '-step-' + String(index)}><MathRichText text={step} /></li>
              ))}
            </ol>
            <div className="p5-example-result">
              <span>Result</span>
              <MathRichText text={selected.workedExample.result} />
            </div>
          </section>

          <section className="p5-engine-coverage">
            <header>
              <div>
                <span className="section-kicker">Engine connection</span>
                <h4>{capabilities.length} deterministic capability{capabilities.length === 1 ? '' : 'ies'}</h4>
              </div>
              <button type="button" onClick={onBrowseTools}>Browse tools</button>
            </header>
            <div>
              {capabilities.slice(0, 8).map((capability) => (
                <span key={capability.id} title={capability.description}>{capability.label}</span>
              ))}
              {capabilities.length > 8 && <span>+{capabilities.length - 8} more</span>}
            </div>
          </section>

          <div className="p5-concept-actions">
            <button
              type="button"
              className="primary-action"
              onClick={() => onStartConcept(selected.id)}
            >
              Start guided practice
            </button>
            <span>
              {selectedProgress?.seen
                ? percentage(selectedProgress.accuracy) + ' accuracy · ' + String(selectedProgress.due) + ' due'
                : 'Hints and worked solutions remain available in guided mode.'}
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}
