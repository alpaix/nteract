import { Maybe } from "graphql/jsutils/Maybe";

export interface NotebookDef {
  id: string;
}

export interface MetadataEntryDef {
  key: string;
  value: string;
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
