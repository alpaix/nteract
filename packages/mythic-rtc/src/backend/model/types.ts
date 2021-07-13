import { Observable } from "rxjs";
import { SharedString } from "@fluidframework/sequence";
import { CellDef, CellInput, MetadataEntryDef } from "../schema";

/**
 * Describes the public API surface for our Fluid DataObject.
 */
export interface ISolidModel {
  readonly cells$: Observable<CellOrderEvent>;
  readonly source$: Observable<ICellSourceEvent>;
  readonly metadata: MetadataEntryDef[];
  getCells(): Promise<CellModel[]>;
  getCell(id: string): Promise<CellModel | undefined>;
  insertCell(cell: CellInput, insertAt: number): Promise<CellModel>;
  deleteCell(id: string): void;
  replaceCell(id: string, cell: CellInput): Promise<void>;
  moveCell(id: string, destId: string, above: boolean): void;
  updateMetadata(parent: string, payload: unknown): void;
}

export interface ICell {
  cellType: "CodeCell" | "MarkdownCell" | "RawCell";
  readonly id: string;
  getSource(): SharedString;
  readonly metadata: MetadataEntryDef[];
}

export interface ICodeCell extends ICell {
  cellType: "CodeCell";
  readonly executionCount: number | undefined;
  getOutputs(): ICellOutput[];
}

export interface IMarkdownCell extends ICell {
  cellType: "MarkdownCell";
}

export interface IRawCell extends ICell {
  cellType: "RawCell";
}

export type CellModel = ICodeCell | IMarkdownCell | IRawCell;

export interface ICellOutput {
  type: "DisplayData" | "ErrorOutput" | "ExecuteResult" | "StreamOutput";
  [key: string]: unknown;
}

export interface ICellSourceEvent {
  id: string;
  diff: string;
}

export interface ICellInsertedEvent {
  event: "CellInsertedEvent";
  id: string;
  pos: number;
}

export interface ICellRemovedEvent {
  event: "CellRemovedEvent";
  pos: number;
}

export interface ICellMovedEvent {
  event: "CellMovedEvent";
  pos1: number;
  pos2: number;
}

export interface ICellReplacedEvent {
  event: "CellReplacedEvent";
  id: string;
  local: boolean;
}

export type CellOrderEvent = ICellInsertedEvent | ICellRemovedEvent | ICellMovedEvent | ICellReplacedEvent;
