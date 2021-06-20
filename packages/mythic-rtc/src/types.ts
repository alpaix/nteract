import * as Immutable from "immutable";
import { Observable } from "rxjs";
import { DocumentNode, ExecutionResult, GraphQLError } from "graphql";
import { Maybe } from "graphql/jsutils/Maybe";
import { ImmutableCell, ImmutableNotebook } from "@nteract/commutable";
import { MythicAction } from "@nteract/myths";

export type ExecuteResult = { [key: string]: any };

export class ExecuteError extends Error {
  constructor(readonly errors: ReadonlyArray<GraphQLError>) {
    super();
  }
}

export interface ICollaborationBackend {
  start(filePath: string): Promise<void>;

  execute(document: DocumentNode, variableValues?: Maybe<{ [key: string]: unknown }>): Promise<ExecuteResult>;

  subscribe(
    document: DocumentNode,
    variableValues?: Maybe<{ [key: string]: unknown }>
  ): Promise<AsyncIterableIterator<ExecutionResult>>;
}

export interface ICollaborationDriver {
  join(filePath: string, notebook: ImmutableNotebook): Observable<MythicAction>;
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
