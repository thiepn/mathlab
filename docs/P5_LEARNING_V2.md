# P5 — Learning v2

## Goal

Turn MathLab Practice from a collection of exercise pools into a concept-led learning system that stays connected to the deterministic mathematics engine.

P5 does **not** create an AI tutor, replace the existing exact grader, or fork the capability catalog. It builds the learning layer on top of the P4 canonical capability registry.

## User flow

Each course now follows the same learning progression:

1. **Learn** — understand the idea, notation, assumptions and failure conditions.
2. **Example** — inspect a complete worked example.
3. **Guided** — solve concept-scoped exercises with progressive hints, worked solutions and deterministic answer checking.
4. **Independent** — continue through adaptive review and closed-help exams.

The progression is guidance, not a hard lock. A learner may inspect later concepts at any time.

## Concept model

The file src/app/learningModel.ts defines first-class learning concepts.

Each concept owns:

- stable concept id;
- course ownership;
- title and summary;
- explicit learning objective;
- readiness checkpoint;
- prerequisite concept ids;
- one or more existing Practice topic ids;
- engine-capability matching terms;
- a complete worked example.

The post-v2 course set remains:

- Algebra & Equations
- Functions & Calculus
- Linear Algebra
- Real Analysis
- Probability & Statistics
- Discrete Math & Algorithms
- Numerical Math & ODEs
- Verify My Work

P5 currently defines 21 concept nodes across those courses.

## P4 registry integration

The P4 registry remains the only public mathematical capability authority.

P5 calls capabilitiesForCourse(...) and deterministically assigns every course capability to exactly one learning concept. Concepts use focused mathematical terms to claim the capabilities they teach most directly. Each course has a declared catch-all concept so a new P4 capability can never silently disappear from the learning surface.

This gives P5 a strict parity property:

    capabilities exposed to a course by P4
            =
    union of capabilities mapped to that course's P5 concepts

The P5 regression suite rejects:

- uncovered capabilities;
- duplicate capability assignment inside a course;
- unknown prerequisite ids;
- concept references to missing Practice topics;
- Practice topics that no concept uses;
- concepts without worked examples.

P4 remains responsible for capability identity and course ownership. P5 does not duplicate that metadata.

## Worked examples

Every concept carries a short deterministic worked example with:

- problem statement;
- ordered reasoning steps;
- final result.

Worked examples are instructional content, not proof certificates. Mathematical verification still comes from the existing engine and Proof Lab.

## Guided practice

buildGuidedConceptSession(...) produces exercises only from the Practice topics linked to the selected concept.

The builder:

- includes existing authored exercises;
- generates bounded deterministic variants from existing exercise templates;
- prioritizes unseen and lower-mastery material;
- never changes answer grading;
- preserves existing hints and solution reveal behavior;
- records attempts through the existing Practice progress model.

The existing course practice, adaptive review and exam builders remain available.

## Mastery and prerequisites

Concept mastery is projected from the existing per-exercise Practice records for the concept's topic set. P5 deliberately avoids creating a second persistence system.

A prerequisite is considered ready at concept mastery >= 0.55. This threshold is advisory:

- the UI highlights prerequisite review;
- later concepts remain accessible;
- no course is hard locked.

The recommendation function selects an available unseen concept first, then the lowest-mastery ready concept.

## Practice UI

The Courses tab now adds a Learning pathway panel inside each selected course.

It exposes:

- ordered concept navigation;
- concept mastery and recommendation state;
- the four learning stages;
- objective and readiness checkpoint;
- prerequisite guidance;
- a worked example;
- P4 engine-capability connection;
- concept-scoped guided-practice launch.

The existing Review, Exam and Progress tabs remain intact.

## Accessibility and responsive behavior

P5 reuses the established MathLab design system and accessibility contract.

The new learning UI includes:

- semantic course-concept navigation;
- aria-current="step" for the selected concept;
- keyboard-operable controls;
- minimum interaction sizing compatible with the existing touch-target gate;
- horizontal concept navigation on narrow screens instead of page overflow;
- single-column worked content at phone widths;
- forced-colors border preservation.

No existing accessibility, browser or device gate is relaxed.

## Non-goals

P5 does not:

- add an LLM tutor or chat surface;
- generate unverified natural-language mathematical answers;
- replace Practice progress storage;
- replace exact grading;
- add new mathematical engine algorithms;
- remove adaptive review or exams;
- redesign Work, Visualize, Tools, Proof or Reference;
- start P6 dynamic exploration work.

## Acceptance gate

P5 is complete only when the exact branch head passes:

1. release audit;
2. E12 mathematical audit;
3. stable-release audit;
4. accessibility/device audit;
5. worksheet audit;
6. input/interaction audit;
7. P4 capability-registry audit;
8. P5 Learning v2 audit;
9. P5 learning-model and engine-parity unit tests;
10. complete existing unit regression suite;
11. strict TypeScript and production build;
12. Chromium / Firefox / WebKit + phone/tablet browser matrix;
13. live custom-domain verification after merge.

The P5 audit is additive. It does not weaken any earlier certification gate.
