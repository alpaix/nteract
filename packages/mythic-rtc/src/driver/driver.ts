import { Observable, Subject } from "rxjs";
import gql from "graphql-tag";
import { ImmutableNotebook } from "@nteract/commutable";
import { ContentRef, KernelRef } from "@nteract/types";
import { actions as coreActions } from "@nteract/core";
import { MythicAction } from "@nteract/myths";
import namespaceDebug from "../common/debug";
import { ICollaborationBackend, ICollaborationDriver } from "../types";
import { joinSessionSucceeded } from "../myths";
import { NotebookDef, UpsertNotebookInput } from "../backend/schema";
import { ActionReplicator } from "./replicator";
import { fromNotebookDef, makeContentInput } from "./conversions";

export class CollaborationDriver implements ICollaborationDriver {
  private readonly debug: debug.Debugger = namespaceDebug.extend("rtc", "|");
  constructor(
    private readonly backend: ICollaborationBackend,
    private readonly store: any,
    private readonly contentRef: ContentRef
  ) { }

  join(filePath: string, notebook: ImmutableNotebook, kernelRef: KernelRef): Observable<MythicAction<string, string, {}>> {
    const actionStream = async (actions$: Subject<MythicAction>) => {
      await this.backend.start(filePath);
      await this.loadModel(filePath, notebook, kernelRef, actions$);
      const replicator = new ActionReplicator(actions$, this.backend, this.store, this.contentRef);
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

  //#region private
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
      const upsert = await this.backend.execute(mutation, {
        input: {
          filePath,
          content: contentInput
        } as UpsertNotebookInput
      });
      this.debug("Upserted notebook", upsert);

      this.createNotebook(actions$, filePath, upsert.upsertNotebook.notebook, kernelRef);
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

    // actions$.next(initializeCellMap.create({ notebook: content, contentRef: this.contentRef }));
    // updateCellMap.create({ localId: cell.id, remoteId: cell.id });
  }
  //#endregion
}
