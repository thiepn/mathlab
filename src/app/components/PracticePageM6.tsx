import { useEffect, useMemo, useState } from 'react';
import {
  PRACTICE_COURSES,
  buildAdaptiveReview,
  buildCourseSession,
  buildExamSession,
  courseProgress,
  emptyPracticeProgress,
  gradePracticeAnswer,
  markSessionComplete,
  overallMastery,
  recordPracticeAttempt,
  type PracticeCourse,
  type PracticeExercise,
  type PracticeGrade,
  type PracticeProgressState,
} from '../../lib/math/practice';
import { loadPracticeProgress, resetPracticeProgress, savePracticeProgress } from '../../lib/storage/practice';
import { answeredQuestionCount, courseAccentIndex } from '../learningSurfaces';
import { MathRichText } from './MathRichText';
import { MathValue } from './MathValue';

type PracticeTab = 'courses' | 'review' | 'exam' | 'progress';
type SessionKind = 'course' | 'review' | 'exam';

interface SessionState {
  kind: SessionKind;
  title: string;
  exercises: PracticeExercise[];
  index: number;
  answers: Record<string, string>;
  examSubmitted: boolean;
  examGrades: Record<string, PracticeGrade>;
}

function percentage(value: number): string { return `${Math.round(value * 100)}%`; }
function difficultyLabel(value: number): string { return ['', 'Intro', 'Core', 'Intermediate', 'Advanced', 'Challenge'][value] ?? 'Core'; }

function expectedLabel(exercise: PracticeExercise): string {
  return exercise.answerType === 'choice'
    ? exercise.choices?.find((item) => item.id === exercise.expected)?.label ?? exercise.expected
    : exercise.expected;
}

function PracticeExpected({ exercise }: { exercise: PracticeExercise }) {
  const value = expectedLabel(exercise);
  return exercise.answerType === 'math'
    ? <MathValue source={value} compact={false} forceMathStyle />
    : <MathRichText text={value} />;
}

function QuestionRail({ session, current, onJump }: { session: SessionState; current: number; onJump: (index: number) => void }) {
  return (
    <nav className="m6-question-rail" aria-label="Session questions">
      <span className="section-kicker">Questions</span>
      <div>
        {session.exercises.map((exercise, index) => {
          const answered = Boolean(session.answers[exercise.id]?.trim());
          const graded = session.examGrades[exercise.id];
          const reachable = session.kind === 'exam' || index <= current;
          return (
            <button
              key={exercise.id}
              className={`${index === current ? 'is-current' : ''} ${answered ? 'is-answered' : ''} ${graded ? graded.correct ? 'is-correct' : 'is-wrong' : ''}`}
              disabled={!reachable || session.examSubmitted}
              onClick={() => onJump(index)}
              aria-label={`Question ${index + 1}${answered ? ', answered' : ''}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <small>{answeredQuestionCount(session.answers)} of {session.exercises.length} answered</small>
    </nav>
  );
}

export function PracticePage() {
  const [tab, setTab] = useState<PracticeTab>('courses');
  const [progress, setProgress] = useState<PracticeProgressState>(() => emptyPracticeProgress());
  const [hydrated, setHydrated] = useState(false);
  const [storageIssue, setStorageIssue] = useState('');
  const [session, setSession] = useState<SessionState | null>(null);
  const [answer, setAnswer] = useState('');
  const [grade, setGrade] = useState<PracticeGrade | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);
  const [examCourse, setExamCourse] = useState(PRACTICE_COURSES[0]?.id ?? 'algebra');
  const [examLength, setExamLength] = useState(8);
  const [selectedCourseId, setSelectedCourseId] = useState(PRACTICE_COURSES[0]?.id ?? 'algebra');

  useEffect(() => {
    let live = true;
    void loadPracticeProgress().then((value) => {
      if (!live) return;
      setProgress(value);
      if (value.lastCourseId && PRACTICE_COURSES.some((course) => course.id === value.lastCourseId)) setSelectedCourseId(value.lastCourseId);
      setHydrated(true);
      setStorageIssue('');
    }).catch(() => {
      if (!live) return;
      setHydrated(true);
      setStorageIssue('Practice progress could not be loaded. This session will continue in memory only.');
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void savePracticeProgress(progress)
      .then(() => setStorageIssue(''))
      .catch(() => setStorageIssue('Practice progress could not be saved. Keep this tab open until storage is available again.'));
  }, [hydrated, progress]);

  const dueCount = useMemo(() => Object.values(progress.records).filter((item) => item.dueAt <= Date.now()).length, [progress]);
  const active = session?.exercises[session.index];
  const selectedCourse = PRACTICE_COURSES.find((course) => course.id === selectedCourseId) ?? PRACTICE_COURSES[0];
  const selectedSummary = selectedCourse ? courseProgress(progress, selectedCourse.id) : null;
  const overallAccuracy = progress.totalAttempts ? progress.totalCorrect / progress.totalAttempts : 0;

  const resetExerciseUi = () => { setAnswer(''); setGrade(null); setHintsShown(0); setSolutionShown(false); };

  const startSession = (kind: SessionKind, course?: PracticeCourse) => {
    const seed = Date.now();
    const exercises = kind === 'review'
      ? buildAdaptiveReview(progress, 10, seed)
      : kind === 'exam'
        ? buildExamSession(course?.id ?? examCourse, examLength, seed)
        : buildCourseSession(course?.id ?? PRACTICE_COURSES[0].id, progress, 8, seed);
    if (!exercises.length) return;
    setSession({
      kind,
      title: kind === 'review' ? 'Adaptive review' : kind === 'exam' ? `${course?.title ?? PRACTICE_COURSES.find((item) => item.id === examCourse)?.title ?? 'Course'} exam` : `${course?.title ?? 'Course'} practice`,
      exercises,
      index: 0,
      answers: {},
      examSubmitted: false,
      examGrades: {},
    });
    resetExerciseUi();
  };

  const finishPracticeSession = () => {
    setProgress((current) => markSessionComplete(current, false));
    setSession(null);
    resetExerciseUi();
  };

  const checkAnswer = () => {
    if (!active || !session || session.kind === 'exam') return;
    const nextGrade = gradePracticeAnswer(active, answer);
    setGrade(nextGrade);
    setSession({ ...session, answers: { ...session.answers, [active.id]: answer } });
    setProgress((current) => recordPracticeAttempt(current, active, nextGrade.correct, hintsShown, solutionShown));
  };

  const nextExercise = () => {
    if (!session) return;
    if (session.index >= session.exercises.length - 1) { finishPracticeSession(); return; }
    setSession({ ...session, index: session.index + 1 });
    resetExerciseUi();
  };

  const saveExamAnswer = (value: string) => {
    if (!session || !active) return;
    setAnswer(value);
    setSession({ ...session, answers: { ...session.answers, [active.id]: value } });
  };

  const jumpSession = (index: number) => {
    if (!session || index < 0 || index >= session.exercises.length) return;
    if (session.kind !== 'exam' && index > session.index) return;
    setSession({ ...session, index });
    const next = session.exercises[index];
    setAnswer(session.answers[next?.id] ?? '');
    setGrade(session.kind === 'exam' ? session.examGrades[next?.id] ?? null : null);
    setHintsShown(0);
    setSolutionShown(false);
  };

  const moveExam = (direction: number) => jumpSession(Math.max(0, Math.min((session?.exercises.length ?? 1) - 1, (session?.index ?? 0) + direction)));

  const submitExam = () => {
    if (!session || session.kind !== 'exam') return;
    const grades: Record<string, PracticeGrade> = {};
    let nextProgress = progress;
    for (const exercise of session.exercises) {
      const result = gradePracticeAnswer(exercise, session.answers[exercise.id] ?? '');
      grades[exercise.id] = result;
      nextProgress = recordPracticeAttempt(nextProgress, exercise, result.correct, 0, false);
    }
    nextProgress = markSessionComplete(nextProgress, true);
    setProgress(nextProgress);
    setSession({ ...session, examSubmitted: true, examGrades: grades });
  };

  if (session && active) {
    if (session.kind === 'exam' && session.examSubmitted) {
      const correct = session.exercises.filter((exercise) => session.examGrades[exercise.id]?.correct).length;
      const score = correct / Math.max(1, session.exercises.length);
      return (
        <main className="workspace practice-page m6-practice-page">
          <section className="m6-session-summary">
            <div><span className="section-kicker">Assessment complete</span><h1>{session.title}</h1><p>Your final submission has been graded and folded into mastery and future review scheduling.</p></div>
            <div className={`m6-score-ring ${score >= .7 ? 'is-good' : ''}`}><strong>{percentage(score)}</strong><span>{correct}/{session.exercises.length} correct</span></div>
          </section>
          <section className="m6-exam-review">
            {session.exercises.map((exercise, index) => {
              const result = session.examGrades[exercise.id];
              return (
                <article key={exercise.id} className={result?.correct ? 'is-correct' : 'is-wrong'}>
                  <header><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{exercise.title}</strong><small>{result?.correct ? 'Verified' : 'Needs review'}</small></div></header>
                  <p className="m6-review-prompt"><MathRichText text={exercise.prompt} /></p>
                  <div className="m6-answer-comparison">
                    <div><span>Your answer</span><div><MathValue source={session.answers[exercise.id] || '—'} compact={false} forceMathStyle /></div></div>
                    <div><span>Expected</span><div><PracticeExpected exercise={exercise} /></div></div>
                  </div>
                  <details><summary>Solution</summary><p><MathRichText text={exercise.solution} /></p></details>
                </article>
              );
            })}
          </section>
          <div className="m6-session-footer"><button className="primary-action" onClick={() => { setSession(null); resetExerciseUi(); }}>Return to Practice</button></div>
        </main>
      );
    }

    const selectedAnswer = session.kind === 'exam' ? (session.answers[active.id] ?? answer) : answer;
    const courseTitle = PRACTICE_COURSES.find((item) => item.id === active.courseId)?.title;
    return (
      <main className="workspace practice-page m6-practice-page m6-session-page">
        <section className="m6-session-header">
          <div><span className="section-kicker">{session.kind === 'exam' ? 'Exam · help locked' : session.kind === 'review' ? 'Adaptive review' : 'Guided practice'}</span><h1>{session.title}</h1><p>{session.kind === 'exam' ? 'Answers are graded only after final submission.' : 'Use hints only when needed; MathLab records the support required for future review scheduling.'}</p></div>
          <div className="m6-session-position"><strong>{session.index + 1}</strong><span>of {session.exercises.length}</span></div>
        </section>
        <div className="session-progress m6-session-progress"><span style={{ width: `${((session.index + 1) / session.exercises.length) * 100}%` }} /></div>

        <div className="m6-session-layout">
          <section className="exercise-card m6-exercise-card">
            <div className="exercise-meta m6-exercise-meta"><span>{courseTitle}</span><span>{active.source === 'generated' ? 'Generated' : 'Authored'}</span><span>{difficultyLabel(active.difficulty)}</span></div>
            <h2>{active.title}</h2>
            <div className="exercise-prompt m6-exercise-prompt"><MathRichText text={active.prompt} /></div>

            {active.answerType === 'choice' ? (
              <div className="practice-choices m6-practice-choices">
                {active.choices?.map((choice, index) => (
                  <button key={choice.id} className={selectedAnswer === choice.id ? 'is-selected' : ''} disabled={Boolean(grade) && session.kind !== 'exam'} onClick={() => session.kind === 'exam' ? saveExamAnswer(choice.id) : setAnswer(choice.id)}>
                    <span>{String.fromCharCode(65 + index)}</span><MathRichText text={choice.label} />
                  </button>
                ))}
              </div>
            ) : (
              <label className="practice-answer m6-practice-answer"><span>Your answer</span><input value={selectedAnswer} disabled={Boolean(grade) && session.kind !== 'exam'} onChange={(event) => session.kind === 'exam' ? saveExamAnswer(event.target.value) : setAnswer(event.target.value)} spellCheck={false} placeholder="Enter exact mathematical form" /></label>
            )}

            {session.kind !== 'exam' && (
              <>
                {hintsShown > 0 && <div className="hint-stack m6-hint-stack">{active.hints.slice(0, hintsShown).map((hint, index) => <div key={`${active.id}-hint-${index}`}><span>Hint {index + 1}</span><p><MathRichText text={hint} /></p></div>)}</div>}
                {solutionShown && <div className="solution-reveal m6-solution-reveal"><span>Worked solution</span><p><MathRichText text={active.solution} /></p><div className="practice-typeset-answer"><PracticeExpected exercise={active} /></div></div>}
                {grade && <div className={`practice-feedback m6-practice-feedback ${grade.correct ? 'is-correct' : grade.status === 'conditional' ? 'is-conditional' : 'is-wrong'}`}><strong>{grade.correct ? 'Verified' : grade.status === 'conditional' ? 'Conditionally valid' : 'Not correct'}</strong><p><MathRichText text={grade.feedback} /></p></div>}
                <div className="exercise-actions m6-exercise-actions">
                  {!grade && <button className="primary-action" disabled={!answer.trim()} onClick={checkAnswer}>Check answer</button>}
                  {(!grade || !grade.correct) && hintsShown < active.hints.length && <button onClick={() => setHintsShown((value) => value + 1)}>Hint {hintsShown + 1}</button>}
                  {(!grade || !grade.correct) && !solutionShown && <button onClick={() => setSolutionShown(true)}>Show solution</button>}
                  {grade && !grade.correct && <button className="primary-action" onClick={() => { setGrade(null); setAnswer(''); }}>Try again</button>}
                  {grade && grade.correct && <button className="primary-action" onClick={nextExercise}>{session.index === session.exercises.length - 1 ? 'Finish session' : 'Next exercise'}</button>}
                </div>
              </>
            )}

            {session.kind === 'exam' && <div className="exercise-actions m6-exercise-actions exam-actions"><button disabled={session.index === 0} onClick={() => moveExam(-1)}>Previous</button>{session.index < session.exercises.length - 1 ? <button className="primary-action" onClick={() => moveExam(1)}>Next</button> : <button className="primary-action" onClick={submitExam}>Submit exam</button>}</div>}
          </section>

          <aside className="m6-session-sidebar">
            <QuestionRail session={session} current={session.index} onJump={jumpSession} />
            <section className="m6-session-rule"><span className="section-kicker">Session rules</span><p>{session.kind === 'exam' ? 'Hints, solutions and per-question grading stay hidden until submission.' : 'Exact equivalence and supported proof rules grade mathematical answers. Unsupported equivalence is never guessed.'}</p></section>
            <button className="practice-exit" onClick={() => { if (window.confirm('End this session? Current unsubmitted answers will be lost.')) { setSession(null); resetExerciseUi(); } }}>End session</button>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace practice-page m6-practice-page">
      {storageIssue && <div className="release-storage-warning" role="alert">{storageIssue}</div>}
      <section className="m6-learning-hero">
        <div><span className="section-kicker">Practice &amp; Courses</span><h1>Study mathematics with feedback that stays inside the engine.</h1><p>Course practice, scheduled review and closed-help exams all use MathLab’s deterministic mathematics and proof stack.</p></div>
        <div className="m6-learning-stats">
          <article><strong>{percentage(overallMastery(progress))}</strong><span>Mastery</span></article>
          <article><strong>{progress.totalAttempts ? percentage(overallAccuracy) : '—'}</strong><span>Accuracy</span></article>
          <article className={dueCount ? 'is-due' : ''}><strong>{dueCount}</strong><span>Due now</span></article>
          <article><strong>{progress.completedSessions}</strong><span>Sessions</span></article>
        </div>
      </section>

      <nav className="practice-tabs m6-study-tabs" aria-label="Practice sections">
        {(['courses', 'review', 'exam', 'progress'] as PracticeTab[]).map((item) => <button key={item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{item === 'courses' ? 'Courses' : item === 'review' ? 'Review' : item === 'exam' ? 'Exam' : 'Progress'}{item === 'review' && dueCount > 0 ? <span>{dueCount}</span> : null}</button>)}
      </nav>

      {tab === 'courses' && selectedCourse && selectedSummary && (
        <section className="m6-course-workbench">
          <aside className="m6-course-nav">
            <span className="section-kicker">Course map</span>
            {PRACTICE_COURSES.map((course) => {
              const summary = courseProgress(progress, course.id);
              return <button key={course.id} className={`${selectedCourse.id === course.id ? 'is-active' : ''} course-accent-${courseAccentIndex(course.id)}`} onClick={() => setSelectedCourseId(course.id)}><span>{course.title}</span><strong>{percentage(summary.mastery)}</strong><i><b style={{ width: percentage(summary.mastery) }} /></i></button>;
            })}
          </aside>

          <div className="m6-course-detail">
            <header><div><span className="section-kicker">{selectedCourse.phaseRange}</span><h2>{selectedCourse.title}</h2><p>{selectedCourse.description}</p></div><button className="primary-action" onClick={() => startSession('course', selectedCourse)}>Start practice</button></header>
            <div className="m6-course-metrics"><span><strong>{percentage(selectedSummary.mastery)}</strong> mastery</span><span><strong>{selectedSummary.attempts ? percentage(selectedSummary.accuracy) : '—'}</strong> accuracy</span><span><strong>{selectedSummary.seen}</strong> seen</span><span><strong>{selectedSummary.due}</strong> due</span></div>
            <div className="mastery-bar m6-mastery-bar"><span style={{ width: percentage(selectedSummary.mastery) }} /></div>
            <div className="m6-topic-list">
              {selectedCourse.topics.map((topic, index) => <article key={topic.id}><div className="m6-topic-index">{String(index + 1).padStart(2, '0')}</div><div><strong>{topic.title}</strong><p>{topic.description}</p></div><span>{topic.templateIds.length} generated · {topic.authoredIds.length} authored</span></article>)}
            </div>
          </div>
        </section>
      )}

      {tab === 'review' && (
        <section className="m6-review-workbench">
          <div className="m6-review-callout"><span className="section-kicker">Adaptive review</span><h2>{dueCount ? `${dueCount} exercise${dueCount === 1 ? '' : 's'} ready for review` : 'Your review queue is clear'}</h2><p>Overdue work comes first, followed by low-mastery and unseen material. Incorrect answers return quickly; stable answers expand their interval.</p><button className="primary-action" onClick={() => startSession('review')}>{dueCount ? 'Review due work' : 'Start adaptive practice'}</button></div>
          <div className="m6-spacing-model"><span className="section-kicker">Scheduling model</span><article><strong>Again</strong><p>Returns in about ten minutes.</p></article><article><strong>Hard</strong><p>Short interval growth keeps weak material nearby.</p></article><article><strong>Good</strong><p>Ease-based spacing expands normal recall.</p></article><article><strong>Easy</strong><p>Stable material moves farther into the future.</p></article></div>
        </section>
      )}

      {tab === 'exam' && (
        <section className="m6-exam-builder">
          <div><span className="section-kicker">Closed-help assessment</span><h2>Build an exam session</h2><p>No hints, no solution reveal and no per-question correctness until final submission. Completed exams still update mastery and future review scheduling.</p></div>
          <div className="m6-exam-controls">
            <label><span>Course</span><select value={examCourse} onChange={(event) => setExamCourse(event.target.value)}>{PRACTICE_COURSES.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            <label><span>Questions</span><select value={examLength} onChange={(event) => setExamLength(Number(event.target.value))}><option value={5}>5 questions</option><option value={8}>8 questions</option><option value={10}>10 questions</option><option value={12}>12 questions</option></select></label>
            <button className="primary-action" onClick={() => startSession('exam', PRACTICE_COURSES.find((item) => item.id === examCourse))}>Start exam</button>
          </div>
        </section>
      )}

      {tab === 'progress' && (
        <section className="m6-progress-dashboard">
          <div className="m6-progress-summary"><article><strong>{percentage(overallMastery(progress))}</strong><span>Overall mastery</span></article><article><strong>{progress.totalAttempts ? percentage(overallAccuracy) : '—'}</strong><span>Accuracy</span></article><article><strong>{progress.totalAttempts}</strong><span>Total attempts</span></article><article><strong>{progress.completedExams}</strong><span>Completed exams</span></article></div>
          <div className="m6-progress-courses">
            {PRACTICE_COURSES.map((course) => { const summary = courseProgress(progress, course.id); return <article key={course.id}><header><strong>{course.title}</strong><span>{percentage(summary.mastery)}</span></header><div className="mastery-bar"><span style={{ width: percentage(summary.mastery) }} /></div><footer><span>{summary.seen} seen</span><span>{summary.attempts} attempts</span><span>{summary.attempts ? percentage(summary.accuracy) : '—'} accuracy</span><span>{summary.due} due</span></footer></article>; })}
          </div>
          <button className="danger-text" onClick={() => { if (window.confirm('Reset all practice progress? Workspace mathematics will not be affected.')) void resetPracticeProgress().then((value) => { setProgress(value); setStorageIssue(''); }).catch(() => setStorageIssue('Practice progress could not be reset because local storage is unavailable.')); }}>Reset practice progress</button>
        </section>
      )}
    </main>
  );
}
