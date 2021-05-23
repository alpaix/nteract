import * as Immutable from "immutable";
import { Observable } from "rxjs";
import { DocumentNode, ExecutionResult, Source } from "graphql";
import { Maybe } from "graphql/jsutils/Maybe";
import { MythicAction } from "@nteract/myths";
import { ImmutableCell } from "@nteract/commutable";

export interface ICollaborationBackend {
  execute(document: DocumentNode, variableValues?: Maybe<{ [key: string]: any }>): Promise<ExecutionResult>;

  subscribe(
    document: DocumentNode,
    variableValues?: Maybe<{ [key: string]: any }>
  ): Promise<AsyncIterableIterator<ExecutionResult>>;

  runQuery(query: string | Source, variableValues?: any): Promise<ExecutionResult>;
}

export interface ICollaborationDriver {
  join(): Observable<MythicAction>;
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
