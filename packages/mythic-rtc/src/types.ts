import * as Immutable from "immutable";
import { Observable } from "rxjs";
import { DocumentNode, ExecutionResult } from "graphql";
import { Maybe } from "graphql/jsutils/Maybe";
import { ImmutableCell } from "@nteract/commutable";
import { MythicAction } from "@nteract/myths";

export interface ICollaborationBackend {
  execute(document: DocumentNode, variableValues?: Maybe<{ [key: string]: unknown }>): Promise<ExecutionResult>;

  subscribe(
    document: DocumentNode,
    variableValues?: Maybe<{ [key: string]: unknown }>
  ): Promise<AsyncIterableIterator<ExecutionResult>>;
}

export interface ICollaborationDriver {
  join(filePath: string): Observable<MythicAction>;
  leave(): Observable<MythicAction>;
}

export interface IActionRecorder {
  recordInsertCell(id: string, insertAt: number, cell: ImmutableCell): Observable<MythicAction>;
  recordDeleteCell(id: string): Observable<MythicAction>;
  recordCellContent(id: string, value: string): Observable<MythicAction>;
}

export interface ICollaborationState {
  isLoaded: boolean;
  driver: ICollaborationDriver;
  recorder: IActionRecorder;
  cellIdMap: Immutable.Map<string, string>;
  reverseCellIdMap: Immutable.Map<string, string>;
}
