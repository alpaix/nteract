import { Maybe } from "graphql/jsutils/Maybe";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InsertCellInput {}

export type DiffType = "insert" | "delete" | "replace";

export interface PatchCellSourceInput {
  id: string;
  type: DiffType;
  diff: string;
  start1: number;
  len1: number;
  start2: number;
  len2: number;
}

interface BaseCellDef {
  id: string;
}

export interface CodeCellDef extends BaseCellDef {
  cell_type: "code";
  metadata: Map<string, any>;
  execution_count: Maybe<number>;
  source: string;
  // outputs: ImmutableOutput[];
}

export interface MarkdownCellDef extends BaseCellDef {
  cell_type: "markdown";
  source: string;
  metadata: Map<string, any>;
}

export interface RawCellDef extends BaseCellDef {
  cell_type: "raw";
  source: string;
  metadata: Map<string, any>;
}

export type CellDef = MarkdownCellDef | CodeCellDef | RawCellDef;

export type CellType = "raw" | "markdown" | "code";
