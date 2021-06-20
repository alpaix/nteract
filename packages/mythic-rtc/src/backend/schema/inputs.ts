import { NotebookDef } from "./types";

export interface UpsertNotebookInput {
  filePath: string;
  content: NotebookContentInput;
}

export interface UpsertNotebookPayload {
  notebook: NotebookDef;
}

export interface NotebookContentInput {
  cells: CellInput[];
  metadata?: MetadataInput[];
}

export type CellInput = { code: CodeCellInput } | { markdown: TextCellInput } | { raw: TextCellInput };

export interface CodeCellInput {
  source: string;
  metadata?: MetadataInput[];
  executionCount?: number | null;
  outputs?: OutputInput[];
}

export interface TextCellInput {
  source: string;
  metadata?: MetadataInput[];
}

export interface MetadataInput {
  name: string;
  value: string;
}

export interface OutputInput {
  executeResult: ExecuteResultInput;
  displayData: DisplayDataInput;
  stream: StreamOutputInput;
  error: ErrorOutputInput;
}

export interface ExecuteResultInput {
  executionCount: number;
  data: MediaBundleInput[];
  metadata: MetadataInput[];
}

export interface DisplayDataInput {
  data: MediaBundleInput[];
  metadata: MetadataInput[];
}

export interface StreamOutputInput {
  name: OutputStreamType;
  text: String;
}

export type OutputStreamType = "stdout" | "stderr";

export interface ErrorOutputInput {
  ename: string;
  evalue: string;
  traceback: string[];
}

export interface MediaBundleInput {
  name: string;
  value: string;
}

export interface InsertCellInput {
  insertAt: number;
  cell: CellInput;
}

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
