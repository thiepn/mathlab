import { capabilitiesFor as rawCapabilitiesForObject, type ObjectCapability } from '../lib/math/capabilitiesE5';
import type { SemanticMathObject } from '../lib/math/types';
import { E3_VISUAL_TOOLS } from './e3VisualTools';
import { E4_TOOL_CATALOG } from './e4ToolCatalog';
import { E5_TOOL_CATALOG } from './e5ToolCatalog';
import { E6_TOOL_CATALOG } from './e6ToolCatalog';
import { E7_TOOL_CATALOG } from './e7ToolCatalog';
import { E8_TOOL_CATALOG } from './e8ToolCatalog';
import { E9_TOOL_CATALOG } from './e9ToolCatalog';
import { E10_TOOL_CATALOG } from './e10ToolCatalog';
import { E11_TOOL_CATALOG } from './e11ToolCatalog';
import { TOOL_CATALOG, TOOL_CATEGORIES, type ToolCatalogItem, type ToolCategory } from './toolCatalog';
import { operationNeedsControls, operationPriority } from './workspaceOperations';

export type CapabilityCourseId =
  | 'algebra'
  | 'calculus'
  | 'linear-algebra'
  | 'analysis'
  | 'probability'
  | 'discrete'
  | 'numerical'
  | 'proof';

export interface CapabilityDescriptor extends ToolCatalogItem {
  searchText: string;
  needsConfiguration: boolean;
  preferredRank: number;
  courseIds: CapabilityCourseId[];
}

export interface ResolvedCapability extends CapabilityDescriptor {
  runtimeGroup: string;
  applicable: boolean;
  available: boolean;
  reason?: string;
}

export interface CapabilityRegistryIntegrity {
  duplicateIds: string[];
  duplicateOperations: string[];
  invalidEntries: string[];
}

export const CAPABILITY_CATEGORIES: readonly ToolCategory[] = TOOL_CATEGORIES;

export const COURSE_CAPABILITY_CATEGORIES: Record<CapabilityCourseId, readonly ToolCategory[]> = {
  algebra: ['Algebra'],
  calculus: ['Calculus', 'Vector Calculus', 'Visualization'],
  'linear-algebra': ['Linear Algebra'],
  analysis: ['Analysis'],
  probability: ['Probability & Statistics'],
  discrete: ['Discrete Math & Algorithms'],
  numerical: ['Numerical Math & ODEs'],
  proof: ['Proof & Verification'],
};

function searchText(tool: ToolCatalogItem): string {
  return [
    tool.id,
    tool.operation,
    tool.label,
    tool.category,
    tool.phase,
    tool.description,
    tool.objectKinds.join(' '),
    ...tool.aliases,
  ].join(' ').toLowerCase();
}

function courseIdsFor(category: ToolCategory): CapabilityCourseId[] {
  return (Object.entries(COURSE_CAPABILITY_CATEGORIES) as Array<[CapabilityCourseId, readonly ToolCategory[]]>)
    .filter(([, categories]) => categories.includes(category))
    .map(([courseId]) => courseId);
}

function descriptor(tool: ToolCatalogItem): CapabilityDescriptor {
  return {
    ...tool,
    searchText: searchText(tool),
    needsConfiguration: operationNeedsControls(tool.operation),
    preferredRank: operationPriority(tool.operation),
    courseIds: courseIdsFor(tool.category),
  };
}

function uniqueTools(tools: ToolCatalogItem[]): ToolCatalogItem[] {
  const byId = new Map<string, ToolCatalogItem>();
  for (const tool of tools) {
    if (!byId.has(tool.id)) byId.set(tool.id, tool);
  }
  return [...byId.values()];
}

// TOOL_CATALOG remains an internal metadata provider for the older P4–E3 surface.
// All user-facing consumers should use CAPABILITY_REGISTRY instead.
const SOURCE_TOOLS = uniqueTools([
  ...TOOL_CATALOG,
  ...E3_VISUAL_TOOLS,
  ...E4_TOOL_CATALOG,
  ...E5_TOOL_CATALOG,
  ...E6_TOOL_CATALOG,
  ...E7_TOOL_CATALOG,
  ...E8_TOOL_CATALOG,
  ...E9_TOOL_CATALOG,
  ...E10_TOOL_CATALOG,
  ...E11_TOOL_CATALOG,
]);

export const CAPABILITY_REGISTRY: readonly CapabilityDescriptor[] = SOURCE_TOOLS.map(descriptor);

const byId = new Map(CAPABILITY_REGISTRY.map((item) => [item.id, item] as const));
const byOperation = new Map(CAPABILITY_REGISTRY.map((item) => [item.operation, item] as const));

export function findCapability(id: string): CapabilityDescriptor | undefined {
  return byId.get(id) ?? byOperation.get(id);
}

export function capabilitySearchText(capability: CapabilityDescriptor): string {
  return capability.searchText;
}

export function searchCapabilities(query: string, courseId?: CapabilityCourseId): CapabilityDescriptor[] {
  const normalized = query.trim().toLowerCase();
  return CAPABILITY_REGISTRY.filter((capability) =>
    (!courseId || capability.courseIds.includes(courseId))
    && (!normalized || capability.searchText.includes(normalized)));
}

export function capabilitiesForCourse(courseId: string): CapabilityDescriptor[] {
  if (!(courseId in COURSE_CAPABILITY_CATEGORIES)) return [];
  return CAPABILITY_REGISTRY.filter((capability) => capability.courseIds.includes(courseId as CapabilityCourseId));
}

export function rawRuntimeCapabilitiesForObject(object: SemanticMathObject | null): ObjectCapability[] {
  return rawCapabilitiesForObject(object);
}

export function resolveCapabilitiesForObject(object: SemanticMathObject | null): ResolvedCapability[] {
  if (!object) return [];
  const runtime = rawCapabilitiesForObject(object);
  return runtime.map((state) => {
    const metadata = byOperation.get(state.id);
    if (!metadata) {
      // Keep mathematical functionality visible if a future engine operation ships before its
      // registry metadata. The P4 release audit treats this as a certification failure.
      const fallback: CapabilityDescriptor = {
        id: state.id,
        operation: state.id,
        label: state.label,
        category: 'Algebra',
        phase: state.phase,
        objectKinds: [object.kind],
        description: state.reason ?? 'Mathematical operation awaiting registry metadata.',
        example: object.source,
        aliases: [],
        searchText: `${state.id} ${state.label}`.toLowerCase(),
        needsConfiguration: operationNeedsControls(state.id),
        preferredRank: operationPriority(state.id),
        courseIds: [],
      };
      return {
        ...fallback,
        runtimeGroup: state.group,
        applicable: state.applicable,
        available: state.available,
        reason: state.reason,
      };
    }

    return {
      ...metadata,
      runtimeGroup: state.group,
      applicable: state.applicable,
      available: state.available,
      reason: state.reason,
    };
  });
}

export function resolvedCapabilityFor(
  object: SemanticMathObject | null,
  capabilityOrOperationId: string,
): ResolvedCapability | undefined {
  return resolveCapabilitiesForObject(object)
    .find((capability) => capability.id === capabilityOrOperationId || capability.operation === capabilityOrOperationId);
}

export function preferredCapabilitiesForObject(object: SemanticMathObject | null, limit = 6): ResolvedCapability[] {
  return resolveCapabilitiesForObject(object)
    .filter((capability) => capability.available && !capability.needsConfiguration)
    .sort((a, b) =>
      a.preferredRank - b.preferredRank
      || a.runtimeGroup.localeCompare(b.runtimeGroup)
      || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function capabilityRegistryIntegrity(): CapabilityRegistryIntegrity {
  const ids = new Map<string, number>();
  const operations = new Map<string, number>();
  const invalidEntries: string[] = [];

  for (const item of CAPABILITY_REGISTRY) {
    ids.set(item.id, (ids.get(item.id) ?? 0) + 1);
    operations.set(item.operation, (operations.get(item.operation) ?? 0) + 1);
    if (!item.label.trim() || !item.description.trim() || !item.example.trim() || !item.phase.trim()) invalidEntries.push(item.id);
  }

  return {
    duplicateIds: [...ids.entries()].filter(([, count]) => count > 1).map(([id]) => id),
    duplicateOperations: [...operations.entries()].filter(([, count]) => count > 1).map(([id]) => id),
    invalidEntries,
  };
}

export function runtimeRegistryGaps(object: SemanticMathObject | null): string[] {
  if (!object) return [];
  return rawCapabilitiesForObject(object)
    .map((item) => item.id)
    .filter((operation) => !byOperation.has(operation));
}
