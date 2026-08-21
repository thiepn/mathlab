import { describe, expect, it } from 'vitest';
import {
  PRACTICE_COURSES,
  buildAdaptiveReview,
  buildCourseSession,
  buildExamSession,
  courseProgress,
  emptyPracticeProgress,
  generatePracticeExercise,
  getPracticeExercise,
  gradePracticeAnswer,
  markSessionComplete,
  recordPracticeAttempt,
} from '../src/lib/math/practice';

describe('P14 practice and courses', () => {
  it('ships a structured multi-course curriculum', () => {
    expect(PRACTICE_COURSES.length).toBeGreaterThanOrEqual(8);
    expect(PRACTICE_COURSES.every((course) => course.topics.length > 0)).toBe(true);
  });

  it('generates deterministic exercises from seeds', () => {
    const a = generatePracticeExercise('linear-equation', 42);
    const b = generatePracticeExercise('linear-equation', 42);
    expect(a.id).toBe(b.id);
    expect(a.prompt).toBe(b.prompt);
    expect(a.expected).toBe(b.expected);
    expect(getPracticeExercise(a.id)?.expected).toBe(a.expected);
  });

  it('delegates mathematical grading to exact P13 verification', () => {
    const exercise = generatePracticeExercise('expand-quadratic', 91);
    expect(gradePracticeAnswer(exercise, exercise.expected).correct).toBe(true);
    expect(gradePracticeAnswer(exercise, 'x^2 + 999').correct).toBe(false);
  });

  it('grades authored multiple-choice exercises exactly', () => {
    const exercise = getPracticeExercise('auth:analysis-harmonic');
    expect(exercise).not.toBeNull();
    expect(gradePracticeAnswer(exercise!, 'divergent').correct).toBe(true);
    expect(gradePracticeAnswer(exercise!, 'absolute').correct).toBe(false);
  });

  it('updates mastery and spaced review intervals', () => {
    const exercise = generatePracticeExercise('linear-equation', 8);
    let state = emptyPracticeProgress();
    state = recordPracticeAttempt(state, exercise, false, 0, false, 1_000_000);
    const first = state.records[exercise.id];
    expect(first.lastRating).toBe('again');
    expect(first.dueAt).toBeGreaterThan(1_000_000);
    const beforeMastery = first.mastery;
    state = recordPracticeAttempt(state, exercise, true, 0, false, first.dueAt);
    expect(state.records[exercise.id].mastery).toBeGreaterThan(beforeMastery);
    expect(state.totalAttempts).toBe(2);
  });

  it('puts overdue work first in adaptive review', () => {
    const exercise = generatePracticeExercise('linear-equation', 7);
    let state = emptyPracticeProgress();
    state = recordPracticeAttempt(state, exercise, false, 0, false, 0);
    const review = buildAdaptiveReview(state, 5, 123, undefined, 1_000_000_000);
    expect(review[0]?.id).toBe(exercise.id);
  });

  it('builds course and exam sessions with bounded deterministic exercises', () => {
    const state = emptyPracticeProgress();
    const practice = buildCourseSession('algebra', state, 8, 1234);
    const exam = buildExamSession('algebra', 5, 1234);
    expect(practice.length).toBeGreaterThanOrEqual(5);
    expect(exam.length).toBe(5);
    expect(new Set(exam.map((item) => item.id)).size).toBe(exam.length);
  });

  it('summarizes progress and counts completed sessions separately from exams', () => {
    const exercise = generatePracticeExercise('dataset-mean', 5);
    let state = recordPracticeAttempt(emptyPracticeProgress(), exercise, true, 0, false, 10);
    const summary = courseProgress(state, 'probability', 11);
    expect(summary.attempts).toBe(1);
    expect(summary.accuracy).toBe(1);
    state = markSessionComplete(state, false);
    state = markSessionComplete(state, true);
    expect(state.completedSessions).toBe(1);
    expect(state.completedExams).toBe(1);
  });
});
