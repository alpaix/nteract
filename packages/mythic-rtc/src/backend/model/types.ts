import { Observable } from "rxjs";
import { SharedString } from "@fluidframework/sequence";
import { CellDef } from "../schema";

/**
 * Describes the public API surface for our Fluid DataObject.
 */
export interface ISolidModel {
  readonly cells$: Observable<CellOrderEvent>;
  readonly source$: Observable<ICellSourceEvent>;

  getCells(): Promise<ISolidCell[]>;
  getCell(id: string): Promise<ISolidCell | undefined>;
  insertCell(cell: CellDef, insertAt: number): Promise<ISolidCell>;
  deleteCell(id: string): void;
  replaceCell(id: string, cell: CellDef): Promise<void>;
  moveCell(id: string, destId: string, above: boolean): void;
  updateMetadata(parent: string, payload: any): void;
}

export interface ISolidCell {
  readonly id: string;
  getSource(): SharedString;
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
