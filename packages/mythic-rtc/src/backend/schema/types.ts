import { Maybe } from "graphql/jsutils/Maybe";

export interface NotebookDef {
  id: string;
  cells: CellConnectionDef;
  metadata: MetadataEntryDef[];
}

export interface CellConnectionDef {
  nodes: CellDef[];
}

export interface MetadataEntryDef {
  key: string;
  value: string;
}

interface BaseCellDef {
  id: string;
  source: string;
  metadata: MetadataEntryDef[];
}

export interface CodeCellDef extends BaseCellDef {
  __typename: "CodeCell";
  executionCount: Maybe<number>;
  outputs: CellOutputDef[];
}

export interface MarkdownCellDef extends BaseCellDef {
  __typename: "MarkdownCell";
}

export interface RawCellDef extends BaseCellDef {
  __typename: "RawCell";
}

export type CellDef = MarkdownCellDef | CodeCellDef | RawCellDef;

export interface DisplayDataDef {
  __typename: "DisplayData";
  data: MediaBundleEntryDef[];
  metadata: MetadataEntryDef[];
}

export interface ErrorOutputDef {
  __typename: "ErrorOutput";
  ename: string;
  evalue: string;
  traceback: string[];
}

export interface ExecuteResultDef {
  __typename: "ExecuteResult";
  executionCount: number;
  data: MediaBundleEntryDef[];
  metadata: MetadataEntryDef[];
}

export interface StreamOutputDef {
  __typename: "StreamOutput";
  name: OutputStreamType;
  text: string;
}

export type OutputStreamType = "stdout" | "stderr";

export interface MediaBundleEntryDef {
  key: string;
  value: string;
}

export type CellOutputDef = DisplayDataDef | ErrorOutputDef | ExecuteResultDef | StreamOutputDef;
