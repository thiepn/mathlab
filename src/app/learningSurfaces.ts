import type { MathResult } from '../lib/math/types';
import { CAPABILITY_REGISTRY, COURSE_CAPABILITY_CATEGORIES, capabilitiesForCourse } from './capabilityRegistry';
import type { ToolCatalogItem, ToolCategory } from './toolCatalog';

export type ProofOutcome = 'verified' | 'conditionally-valid' | 'invalid' | 'not-proven' | 'pending';

export const COURSE_TOOL_CATEGORIES = COURSE_CAPABILITY_CATEGORIES;

export const PROOF_OUTCOME_COPY: Record<ProofOutcome, { label: string; description: string }> = {
  verified: { label: 'Verified', description: 'The supported exact rules certify this work.' },
  'conditionally-valid': { label: 'Conditional', description: 'The step is valid only when the listed condition is preserved.' },
  invalid: { label: 'Invalid', description: 'MathLab found a contradiction, changed solution set, or counterexample.' },
  'not-proven': { label: 'Not proven', description: 'No supported exact rule certifies the claim. Matching samples are not treated as proof.' },
  pending: { label: 'Awaiting verification', description: 'Enter the work you want MathLab to check, then run the deterministic verifier.' },
};

export function toolsForCourse(courseId: string, catalog: readonly ToolCatalogItem[] = CAPABILITY_REGISTRY): ToolCatalogItem[] {
  if (catalog === CAPABILITY_REGISTRY) return [...capabilitiesForCourse(courseId)];
  const categories = COURSE_TOOL_CATEGORIES[courseId] ?? [];
  return catalog.filter((tool) => categories.includes(tool.category));
}

export function proofOutcome(result: MathResult | null): ProofOutcome {
  if (!result) return 'pending';
  const stepStatus = result.steps.find((step) => step.verificationStatus)?.verificationStatus;
  if (stepStatus === 'verified' || stepStatus === 'conditionally-valid' || stepStatus === 'invalid' || stepStatus === 'not-proven') return stepStatus;

  const sectionText = result.sections?.flatMap((section) => section.facts.map((fact) => `${fact.label} ${fact.display}`)).join(' ') ?? '';
  const text = `${result.display} ${sectionText} ${result.warnings.join(' ')}`.toLowerCase();
  if (/conditionally[- ]valid|conditional/.test(text)) return 'conditionally-valid';
  if (/not[- ]proven|not proven|unknown/.test(text)) return 'not-proven';
  if (/invalid|counterexample|does not follow|not equivalent/.test(text)) return 'invalid';
  if (/verified|valid|entailed|equivalent/.test(text)) return 'verified';
  return 'not-proven';
}

export function courseAccentIndex(courseId: string): number {
  const ids = ['algebra', 'calculus', 'linear-algebra', 'analysis', 'probability', 'discrete', 'numerical', 'proof'];
  const index = ids.indexOf(courseId);
  return index < 0 ? 0 : index;
}

export function answeredQuestionCount(answers: Record<string, string>): number {
  return Object.values(answers).filter((answer) => answer.trim().length > 0).length;
}
