import { CAPABILITY_REGISTRY, findCapability } from './capabilityRegistry';
import type { ToolCatalogItem } from './toolCatalog';

// Compatibility shim. Public surfaces should import capabilityRegistry directly.
export const ALL_TOOL_CATALOG: ToolCatalogItem[] = [...CAPABILITY_REGISTRY];

export function findAllTool(id: string): ToolCatalogItem | undefined {
  return findCapability(id);
}
