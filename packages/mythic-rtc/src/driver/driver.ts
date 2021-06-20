import { Observable, Subject } from "rxjs";
import gql from "graphql-tag";
import { MythicAction } from "@nteract/myths";
import { ContentRef } from "@nteract/types";
import namespaceDebug from "../common/debug";
import { ICollaborationBackend, ICollaborationDriver } from "../types";
import { joinSessionSucceeded } from "../myths";
import { ActionReplicator } from "./replicator";
import { ImmutableNotebook } from "@nteract/commutable";
import { CellInput, NotebookContentInput, UpsertNotebookInput } from "../backend/schema";
import { makeContentInput } from "./conversions";

export class CollaborationDriver implements ICollaborationDriver {
  private readonly debug: debug.Debugger = namespaceDebug.extend("rtc", "|");
  constructor(
    private readonly backend: ICollaborationBackend,
    private readonly store: any,
    private readonly contentRef: ContentRef
  ) {}

  join(filePath: string, notebook: ImmutableNotebook): Observable<MythicAction<string, string, {}>> {
    const actionStream = async (actions$: Subject<MythicAction>) => {
      await this.backend.start(filePath);
      await this.loadModel(filePath, notebook, actions$);
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
  private async loadModel(filePath: string, notebook: ImmutableNotebook, actions$: Subject<MythicAction>) {
    try {
      const mutation = gql`
        mutation UpsertNotebook($input: UpsertNotebookInput!) {
          upsertNotebook(input: $input) {
            notebook {
              id
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

      const query = gql`
        query FetchNotebook($id: ID!) {
          notebook(id: $id) {
            cells {
              nodes {
                __typename
                id
                source
              }
            }
          }
        }
      `;
      const result = await this.backend.execute(query, { id: upsert.upsertNotebook.notebook.id });
      // result.errors[message]
      const notebookData = result.notebook;
      this.createNotebook(actions$, notebookData);
    } catch (error) {
      this.debug(error);
    }
  }

  private createNotebook(actions$: Subject<MythicAction>, notebookData: any) {}
  //#endregion
}
