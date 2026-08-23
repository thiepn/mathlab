import type { AstNode } from './ast';
import type { DerivationStep, Exactness, MathResultSection } from './types';

export interface E11Transform {
  ast?: AstNode;
  display: string;
  exactness: Exactness;
  warnings: string[];
  steps: DerivationStep[];
  sections: MathResultSection[];
}
