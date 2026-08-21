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

type PracticeTab = 'courses' | 'review' | 'exam' | 'progress';
type SessionKind = 'course' | 'review' | 'exam';

interface SessionState {
  kind: SessionKind;
  title: string;
  exercises: PracticeExercise[];
  index: number;
  answers: Record<string,string>;
  examSubmitted: boolean;
  examGrades: Record<string,PracticeGrade>;
}

function percentage(value:number):string { return `${Math.round(value*100)}%`; }
function difficultyLabel(value:number):string { return ['','Intro','Core','Intermediate','Advanced','Challenge'][value] ?? 'Core'; }

export function PracticePage() {
  const [tab,setTab]=useState<PracticeTab>('courses');
  const [progress,setProgress]=useState<PracticeProgressState>(()=>emptyPracticeProgress());
  const [hydrated,setHydrated]=useState(false);
  const [storageIssue,setStorageIssue]=useState('');
  const [session,setSession]=useState<SessionState|null>(null);
  const [answer,setAnswer]=useState('');
  const [grade,setGrade]=useState<PracticeGrade|null>(null);
  const [hintsShown,setHintsShown]=useState(0);
  const [solutionShown,setSolutionShown]=useState(false);
  const [examCourse,setExamCourse]=useState(PRACTICE_COURSES[0]?.id ?? 'algebra');
  const [examLength,setExamLength]=useState(8);

  useEffect(()=>{ let live=true; void loadPracticeProgress().then((value)=>{ if(live){setProgress(value);setHydrated(true);setStorageIssue('');} }).catch(()=>{if(live){setHydrated(true);setStorageIssue('Practice progress could not be loaded. This session will continue in memory only.');}}); return()=>{live=false;}; },[]);
  useEffect(()=>{ if(hydrated)void savePracticeProgress(progress).then(()=>setStorageIssue('')).catch(()=>setStorageIssue('Practice progress could not be saved. Keep this tab open until storage is available again.')); },[hydrated,progress]);

  const dueCount=useMemo(()=>Object.values(progress.records).filter((item)=>item.dueAt<=Date.now()).length,[progress]);
  const active=session?.exercises[session.index];

  const resetExerciseUi=()=>{setAnswer('');setGrade(null);setHintsShown(0);setSolutionShown(false);};

  const startSession=(kind:SessionKind,course?:PracticeCourse)=>{
    const seed=Date.now();
    const exercises=kind==='review'?buildAdaptiveReview(progress,10,seed):kind==='exam'?buildExamSession(course?.id??examCourse,examLength,seed):buildCourseSession(course?.id??PRACTICE_COURSES[0].id,progress,8,seed);
    setSession({kind,title:kind==='review'?'Adaptive review':kind==='exam'?`${course?.title??PRACTICE_COURSES.find((item)=>item.id===examCourse)?.title??'Course'} exam`:`${course?.title??'Course'} practice`,exercises,index:0,answers:{},examSubmitted:false,examGrades:{}});
    resetExerciseUi();
  };

  const finishPracticeSession=()=>{
    setProgress((current)=>markSessionComplete(current,false)); setSession(null); resetExerciseUi();
  };

  const checkAnswer=()=>{
    if(!active||session?.kind==='exam')return;
    const nextGrade=gradePracticeAnswer(active,answer);
    setGrade(nextGrade);
    setProgress((current)=>recordPracticeAttempt(current,active,nextGrade.correct,hintsShown,solutionShown));
  };

  const nextExercise=()=>{
    if(!session)return;
    if(session.index>=session.exercises.length-1){finishPracticeSession();return;}
    setSession({...session,index:session.index+1}); resetExerciseUi();
  };

  const saveExamAnswer=(value:string)=>{
    if(!session||!active)return;
    setAnswer(value);
    setSession({...session,answers:{...session.answers,[active.id]:value}});
  };

  const moveExam=(direction:number)=>{
    if(!session)return;
    const next=Math.max(0,Math.min(session.exercises.length-1,session.index+direction));
    setSession({...session,index:next});
    setAnswer(session.answers[session.exercises[next]?.id]??'');
  };

  const submitExam=()=>{
    if(!session||session.kind!=='exam')return;
    const grades:Record<string,PracticeGrade>={}; let nextProgress=progress;
    for(const exercise of session.exercises){const result=gradePracticeAnswer(exercise,session.answers[exercise.id]??'');grades[exercise.id]=result;nextProgress=recordPracticeAttempt(nextProgress,exercise,result.correct,0,false);}
    nextProgress=markSessionComplete(nextProgress,true); setProgress(nextProgress); setSession({...session,examSubmitted:true,examGrades:grades});
  };

  if(session&&active){
    if(session.kind==='exam'&&session.examSubmitted){
      const correct=session.exercises.filter((exercise)=>session.examGrades[exercise.id]?.correct).length;
      return <main className="workspace practice-page"><section className="practice-hero"><div><span className="section-kicker">Exam session</span><h1>{session.title}</h1><p>Exam submitted. Results are now recorded in mastery and review scheduling.</p></div><div className="practice-score"><strong>{correct}/{session.exercises.length}</strong><span>{percentage(correct/session.exercises.length)}</span></div></section><section className="exam-results">{session.exercises.map((exercise,index)=><article key={exercise.id} className={session.examGrades[exercise.id]?.correct?'is-correct':'is-wrong'}><div><span>Question {index+1}</span><strong>{exercise.title}</strong><p>{exercise.prompt}</p></div><div><span>Your answer</span><code>{session.answers[exercise.id]||'—'}</code><span>Expected</span><code>{exercise.answerType==='choice'?exercise.choices?.find((item)=>item.id===exercise.expected)?.label??exercise.expected:exercise.expected}</code><p>{exercise.solution}</p></div></article>)}</section><div className="practice-footer-actions"><button className="primary-action" onClick={()=>{setSession(null);resetExerciseUi();}}>Return to Practice</button></div></main>;
    }

    const selectedAnswer=session.kind==='exam'?(session.answers[active.id]??answer):answer;
    return <main className="workspace practice-page">
      <section className="practice-session-head"><div><span className="section-kicker">{session.kind==='exam'?'Exam · no hints':session.kind==='review'?'Spaced adaptive review':'Course practice'}</span><h1>{session.title}</h1></div><div className="session-counter"><strong>{session.index+1}</strong><span>/ {session.exercises.length}</span></div></section>
      <div className="session-progress"><span style={{width:`${((session.index+1)/session.exercises.length)*100}%`}} /></div>
      <section className="exercise-card">
        <div className="exercise-meta"><span>{active.source==='generated'?'Generated':'Authored'}</span><span>Difficulty · {difficultyLabel(active.difficulty)}</span><span>{PRACTICE_COURSES.find((item)=>item.id===active.courseId)?.title}</span></div>
        <h2>{active.title}</h2><p className="exercise-prompt">{active.prompt}</p>
        {active.answerType==='choice'?<div className="practice-choices">{active.choices?.map((choice)=><button key={choice.id} className={selectedAnswer===choice.id?'is-selected':''} disabled={Boolean(grade)&&session.kind!=='exam'} onClick={()=>session.kind==='exam'?saveExamAnswer(choice.id):setAnswer(choice.id)}>{choice.label}</button>)}</div>:<label className="practice-answer"><span>Your answer</span><input value={selectedAnswer} disabled={Boolean(grade)&&session.kind!=='exam'} onChange={(event)=>session.kind==='exam'?saveExamAnswer(event.target.value):setAnswer(event.target.value)} spellCheck={false} placeholder="Enter exact mathematical form" /></label>}

        {session.kind!=='exam'&&<>
          <div className="hint-stack">{active.hints.slice(0,hintsShown).map((hint,index)=><div key={`${active.id}-hint-${index}`}><span>Hint {index+1}</span><p>{hint}</p></div>)}</div>
          {solutionShown&&<div className="solution-reveal"><span>Solution</span><p>{active.solution}</p><code>{active.expected}</code></div>}
          {grade&&<div className={`practice-feedback ${grade.correct?'is-correct':grade.status==='conditional'?'is-conditional':'is-wrong'}`}><strong>{grade.correct?'Verified':grade.status==='conditional'?'Conditionally valid':'Not correct'}</strong><p>{grade.feedback}</p></div>}
          <div className="exercise-actions">
            {!grade&&<button className="primary-action" onClick={checkAnswer}>Check with MathLab</button>}
            {(!grade||!grade.correct)&&hintsShown<active.hints.length&&<button onClick={()=>setHintsShown((value)=>value+1)}>Reveal hint</button>}
            {(!grade||!grade.correct)&&!solutionShown&&<button onClick={()=>setSolutionShown(true)}>Reveal solution</button>}
            {grade&&!grade.correct&&<button className="primary-action" onClick={()=>{setGrade(null);setAnswer('');}}>Try again</button>}
            {grade&&grade.correct&&<button className="primary-action" onClick={nextExercise}>{session.index===session.exercises.length-1?'Finish session':'Next exercise'}</button>}
          </div>
        </>}

        {session.kind==='exam'&&<div className="exercise-actions exam-actions"><button disabled={session.index===0} onClick={()=>moveExam(-1)}>Previous</button>{session.index<session.exercises.length-1?<button className="primary-action" onClick={()=>moveExam(1)}>Next</button>:<button className="primary-action" onClick={submitExam}>Submit exam</button>}<span>{Object.keys(session.answers).filter((id)=>session.answers[id]?.trim()).length}/{session.exercises.length} answered</span></div>}
      </section>
      <button className="practice-exit" onClick={()=>{if(window.confirm('End this session? Current unsubmitted answers will be lost.')){setSession(null);resetExerciseUi();}}}>End session</button>
    </main>;
  }

  return <main className="workspace practice-page">
    {storageIssue&&<div className="release-storage-warning" role="alert">{storageIssue}</div>}
    <section className="practice-hero"><div><span className="section-kicker">Adaptive learning</span><h1>Practice &amp; Courses</h1><p>Learn through exact MathLab exercises, verified work, layered hints, scheduled review and exam sessions. Generated exercises are deterministic and remain inside the supported mathematics boundary.</p></div><div className="practice-overview"><div><strong>{percentage(overallMastery(progress))}</strong><span>Mastery</span></div><div><strong>{dueCount}</strong><span>Due now</span></div><div><strong>{progress.totalAttempts}</strong><span>Attempts</span></div></div></section>

    <nav className="practice-tabs" aria-label="Practice sections">{(['courses','review','exam','progress'] as PracticeTab[]).map((item)=><button key={item} className={tab===item?'is-active':''} onClick={()=>setTab(item)}>{item[0].toUpperCase()+item.slice(1)}{item==='review'&&dueCount>0?<span>{dueCount}</span>:null}</button>)}</nav>

    {tab==='courses'&&<section className="course-grid">{PRACTICE_COURSES.map((course)=>{const summary=courseProgress(progress,course.id);return <article key={course.id} className="course-card"><div className="course-card-head"><span>{course.phaseRange}</span><strong>{course.title}</strong></div><p>{course.description}</p><div className="course-topics">{course.topics.map((topic)=><span key={topic.id}>{topic.title}</span>)}</div><div className="course-metrics"><span>Mastery <strong>{percentage(summary.mastery)}</strong></span><span>Accuracy <strong>{summary.attempts?percentage(summary.accuracy):'—'}</strong></span><span>Seen <strong>{summary.seen}</strong></span></div><div className="mastery-bar"><span style={{width:percentage(summary.mastery)}} /></div><button className="course-start" onClick={()=>startSession('course',course)}>Start course practice</button></article>;})}</section>}

    {tab==='review'&&<section className="review-panel"><div><span className="section-kicker">Spaced repetition</span><h2>{dueCount?`${dueCount} exercise${dueCount===1?'':'s'} due now`:'No scheduled reviews due'}</h2><p>Adaptive review starts with overdue work, then prioritizes low-mastery and unseen exercises. Incorrect work returns quickly; successful work receives increasingly longer intervals.</p><button className="primary-action" onClick={()=>startSession('review')}>{dueCount?'Review due work':'Start adaptive practice'}</button></div><div className="scheduler-rules"><article><strong>Again</strong><span>≈ 10 minutes</span></article><article><strong>Hard</strong><span>Short interval growth</span></article><article><strong>Good</strong><span>Ease-based spacing</span></article><article><strong>Easy</strong><span>Longer expansion</span></article></div></section>}

    {tab==='exam'&&<section className="exam-builder"><div><span className="section-kicker">Closed-help assessment</span><h2>Build an exam session</h2><p>Hints, solution reveal and per-question grading are disabled until final submission. The completed exam updates your practice history and future review schedule.</p></div><label><span>Course</span><select value={examCourse} onChange={(event)=>setExamCourse(event.target.value)}>{PRACTICE_COURSES.map((course)=><option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label><span>Questions</span><select value={examLength} onChange={(event)=>setExamLength(Number(event.target.value))}><option value={5}>5</option><option value={8}>8</option><option value={10}>10</option><option value={12}>12</option></select></label><button className="primary-action" onClick={()=>startSession('exam',PRACTICE_COURSES.find((item)=>item.id===examCourse))}>Start exam</button></section>}

    {tab==='progress'&&<section className="progress-dashboard"><div className="progress-summary"><article><strong>{percentage(overallMastery(progress))}</strong><span>Overall mastery</span></article><article><strong>{progress.totalAttempts?percentage(progress.totalCorrect/progress.totalAttempts):'—'}</strong><span>Accuracy</span></article><article><strong>{progress.completedSessions}</strong><span>Practice sessions</span></article><article><strong>{progress.completedExams}</strong><span>Exams</span></article></div><div className="progress-table">{PRACTICE_COURSES.map((course)=>{const summary=courseProgress(progress,course.id);return <div key={course.id}><strong>{course.title}</strong><span>{summary.seen} seen</span><span>{summary.attempts} attempts</span><span>{percentage(summary.mastery)} mastery</span><div className="mastery-bar"><span style={{width:percentage(summary.mastery)}} /></div></div>;})}</div><button className="danger-text" onClick={()=>{if(window.confirm('Reset all practice progress? Workspace mathematics will not be affected.'))void resetPracticeProgress().then((value)=>{setProgress(value);setStorageIssue('');}).catch(()=>setStorageIssue('Practice progress could not be reset because local storage is unavailable.'));}}>Reset practice progress</button></section>}
  </main>;
}
