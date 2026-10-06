import { describe, expect, it } from 'vitest';
import { capabilitiesForCourse } from '../src/app/capabilityRegistry';
import {
  LEARNING_CONCEPTS,
  LEARNING_STAGES,
  buildGuidedConceptSession,
  capabilitiesForConcept,
  conceptReadiness,
  conceptsForCourse,
  learningCoverageForCourse,
  learningModelIntegrity,
  recommendedConceptForCourse,
} from '../src/app/learningModel';
import {
  PRACTICE_COURSES,
  emptyPracticeProgress,
  recordPracticeAttempt,
} from '../src/lib/math/practice';

describe('P5 Learning v2 model', () => {
  it('defines a complete, internally consistent concept graph', () => {
    const integrity = learningModelIntegrity();
    expect(integrity).toEqual({
      duplicateConceptIds: [],
      unknownCourses: [],
      unknownPracticeTopics: [],
      unknownPrerequisites: [],
      uncoveredPracticeTopics: [],
      uncoveredCapabilities: [],
      conceptsWithoutWorkedExamples: [],
    });
    expect(LEARNING_STAGES.map((stage) => stage.id)).toEqual(['learn', 'example', 'guided', 'independent']);
    expect(LEARNING_CONCEPTS.length).toBeGreaterThanOrEqual(20);
  });

  it('maps every deterministic course capability to exactly one concept', () => {
    for (const course of PRACTICE_COURSES) {
      const coverage = learningCoverageForCourse(course.id);
      const engineCapabilities = capabilitiesForCourse(course.id);
      const mapped = coverage.byConcept.flatMap((item) => item.capabilities);
      expect(coverage.uncoveredCapabilityIds).toEqual([]);
      expect(coverage.totalCapabilities).toBe(engineCapabilities.length);
      expect(coverage.coveredCapabilities).toBe(engineCapabilities.length);
      expect(mapped.map((capability) => capability.id).sort())
        .toEqual(engineCapabilities.map((capability) => capability.id).sort());
      expect(new Set(mapped.map((capability) => capability.id)).size).toBe(mapped.length);
    }
  });

  it('gives every course an ordered concept pathway with real practice material', () => {
    const state = emptyPracticeProgress();
    for (const course of PRACTICE_COURSES) {
      const concepts = conceptsForCourse(course.id);
      expect(concepts.length).toBeGreaterThan(0);
      expect(recommendedConceptForCourse(course.id, state)?.id).toBe(concepts[0]?.id);
      for (const concept of concepts) {
        expect(concept.objective.length).toBeGreaterThan(20);
        expect(concept.checkpoint.length).toBeGreaterThan(20);
        expect(capabilitiesForConcept(concept.id)).toBeDefined();
        const session = buildGuidedConceptSession(concept.id, state, 4, 12345);
        expect(session.length).toBeGreaterThan(0);
        expect(session.every((exercise) => concept.practiceTopicIds.includes(exercise.topicId))).toBe(true);
      }
    }
  });

  it('uses prerequisite mastery as guidance without hard-locking concept access', () => {
    const state = emptyPracticeProgress();
    const secondAlgebra = conceptsForCourse('algebra')[1];
    expect(secondAlgebra?.prerequisites.length).toBeGreaterThan(0);
    expect(conceptReadiness(state, secondAlgebra!.id).ready).toBe(false);

    const first = conceptsForCourse('algebra')[0]!;
    const exercise = buildGuidedConceptSession(first.id, state, 1, 777)[0]!;
    let progressed = state;
    for (let index = 0; index < 7; index += 1) {
      progressed = recordPracticeAttempt(progressed, exercise, true, 0, false, 1_000_000 + index);
    }
    expect(conceptReadiness(progressed, secondAlgebra!.id).ready).toBe(true);
  });
});
