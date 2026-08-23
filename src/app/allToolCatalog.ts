import { E4_TOOL_CATALOG } from './e4ToolCatalog';
import { E5_TOOL_CATALOG } from './e5ToolCatalog';
import { E6_TOOL_CATALOG } from './e6ToolCatalog';
import { E7_TOOL_CATALOG } from './e7ToolCatalog';
import { E8_TOOL_CATALOG } from './e8ToolCatalog';
import { TOOL_CATALOG, type ToolCatalogItem } from './toolCatalog';

export const ALL_TOOL_CATALOG:ToolCatalogItem[]=[...TOOL_CATALOG,...E4_TOOL_CATALOG,...E5_TOOL_CATALOG,...E6_TOOL_CATALOG,...E7_TOOL_CATALOG,...E8_TOOL_CATALOG];

export function findAllTool(id:string):ToolCatalogItem|undefined{return ALL_TOOL_CATALOG.find(tool=>tool.id===id);}
