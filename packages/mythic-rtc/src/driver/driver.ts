import { EMPTY, from, Observable, Subject } from "rxjs";
import gql from "graphql-tag";
import { ImmutableCell, ImmutableNotebook } from "@nteract/commutable";
import { ContentRef, KernelRef } from "@nteract/types";
import { actions as coreActions } from "@nteract/core";
import { MythicAction } from "@nteract/myths";
import namespaceDebug from "../common/debug";
import { CollabRootState, IActionRecorder, ICollaborationBackend, ICollaborationDriver } from "../types";
import { deleteCellFromMap, joinSessionSucceeded, updateCellMap } from "../myths";
import { InsertCellInput, NotebookDef, PatchCellSourceInput, UpsertNotebookInput, UpsertNotebookPayload } from "../backend/schema";
import { ActionReplicator } from "./replicator";
import { fromNotebookDef, makeCellInput, makeContentInput } from "./conversions";
import { catchError, map, switchMap } from "rxjs/operators";
import { doesCellIdExistInMap, getRemoteCellId } from "../selectors";

export class CollaborationDriver implements ICollaborationDriver, IActionRecorder {
  private readonly debug: debug.Debugger = namespaceDebug.extend("rtc", "|");
  constructor(
    private readonly backend: ICollaborationBackend,
    private readonly store: any,
    private readonly contentRef: ContentRef
  ) { }

  //#region ICollaborationDriver
  join(filePath: string, notebook: ImmutableNotebook, kernelRef: KernelRef): Observable<MythicAction> {
    const actionStream = async (actions$: Subject<MythicAction>) => {
      await this.backend.start(filePath);
      const notebookId = await this.loadModel(filePath, notebook, kernelRef, actions$);
      const replicator = new ActionReplicator(actions$, this.backend, this.store, this.contentRef, notebookId);
      replicator.subscribe();
      actions$.next(joinSessionSucceeded.create());
      //actions$.complete();
    };

    return new Observable<MythicAction>((subscriber) => {
      const actions$ = new Subject<MythicAction>();
      actions$.subscribe(subscriber);
      actionStream(actions$).catch(console.log);
    });
  }
  leave(): Observable<MythicAction<string, string, {}>> {
    throw new Error("Method not implemented.");
  }
  //#endregion

  //#region IActionRecorder
  recordInsertCell(id: string, insertAt: number, cell: ImmutableCell): Observable<MythicAction> {
    const mutation = gql`
      mutation InsertCell($input: InsertCellInput!) {
        insertCell(input: $input) {
          id
        }
      }
    `;
    const insertP = this.backend.execute(mutation, {
      input: {
        insertAt,
        cell: makeCellInput(cell)
      } as InsertCellInput
    });
    const insert$ = from(insertP).pipe(
      map(result => updateCellMap.create({ localId: id, remoteId: result.insertCell.id })),
      catchError(error => {
        console.log(error);
        return EMPTY;
      }));
    return insert$;
  }

  recordDeleteCell(id: string): Observable<MythicAction> {
    if (!doesCellIdExistInMap(this.state, id)) {
      return EMPTY;
    }
    const remoteCellId = getRemoteCellId(this.state, id);
    const mutation = gql`
        mutation DeleteCell($cellId: ID!) {
          deleteCell(id: $cellId)
        }
      `;
    const deleteP = this.backend
      .execute(mutation, {
        cellId: remoteCellId
      });
    const delete$ = from(deleteP).pipe(
      map(() => deleteCellFromMap.create({ localId: id })),
      catchError(error => {
        console.log(error);
        return EMPTY;
      }));
    return delete$;
  }

  recordCellContent(id: string, value: string): Observable<MythicAction> {
    const remoteCellId = getRemoteCellId(this.state, id) ?? id;
    const mutation = gql`
      mutation PatchCellSource($input: PatchCellSourceInput!) {
        patchCellSource(input: $input)
      }
    `;
    const updateP = this.backend
      .execute(mutation, {
        input: {
          id: remoteCellId,
          type: "replace",
          diff: value
        } as PatchCellSourceInput
      });

    const update$ = from(updateP).pipe(
      switchMap(() => EMPTY),
      catchError(error => {
        console.log(error);
        return EMPTY;
      }));
    return update$;
  }
  //#endregion

  //#region private
  private get state(): CollabRootState {
    return this.store.getState();
  }

  private async loadModel(filePath: string, notebook: ImmutableNotebook, kernelRef: KernelRef, actions$: Subject<MythicAction>) {
    try {
      const mutation = gql`
        mutation UpsertNotebook($input: UpsertNotebookInput!) {
          upsertNotebook(input: $input) {
            notebook {
              id
              cells {
                nodes {
                  __typename
                  id
                  source
                  metadata {
                    key
                    value
                  }
                  ... on CodeCell {
                    executionCount
                    outputs {
                      __typename
                      ... on ExecuteResult {
                        executionCount
                        data {
                          key
                          value
                        }
                        metadata {
                          key
                          value
                        }
                      }
                      ... on DisplayData {
                        data {
                          key
                          value
                        }
                        metadata {
                          key
                          value
                        }
                      }
                      ... on StreamOutput {
                        name
                        text
                      }
                      ... on ErrorOutput {
                        ename
                        evalue
                        traceback
                      }
                    }
                  }
                }
              }
              metadata {
                key
                value
              }
            }
          }
        }
      `;
      const contentInput = makeContentInput(notebook);
      const { upsertNotebook } = await this.backend.execute(mutation, {
        input: {
          filePath,
          content: contentInput
        } as UpsertNotebookInput
      });
      // this.debug("Upserted notebook", upsertNotebook);

      this.createNotebook(actions$, filePath, upsertNotebook.notebook, kernelRef);
      return upsertNotebook.notebook.id;
    } catch (error) {
      this.debug(error);
    }
  }

  private createNotebook(actions$: Subject<MythicAction>, filePath: string, notebookDef: NotebookDef, kernelRef: KernelRef) {
    const content = fromNotebookDef(notebookDef);

    // currently we are setting the last modified date on the in memory notebook
    // to when it was retrieved. This will allow future saves to be compared against the datetime of now.
    const timestamp = new Date();

    const model = {
      content,
      created: timestamp.toJSON(),
      format: "json",
      last_modified: timestamp.toJSON(),
      mimetype: "application/x-ipynb+json",
      name: "",
      path: "",
      type: "notebook",
      writable: true
    };
    this.debug(model);

    actions$.next(
      coreActions.fetchContentFulfilled({
        filepath: filePath,
        model: { ...model },
        kernelRef,
        contentRef: this.contentRef,
        origin: "remote"
      } as any)
    );
  }
  //#endregion
}
