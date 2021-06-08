import { Observable, Subject } from "rxjs";
import gql from "graphql-tag";
import { MythicAction } from "@nteract/myths";
import { ContentRef } from "@nteract/types";
import namespaceDebug from "../common/debug";
import { ICollaborationBackend, ICollaborationDriver } from "../types";
import { joinSessionSucceeded } from "../myths";
import { ActionReplicator } from "./replicator";

export class CollaborationDriver implements ICollaborationDriver {
  private readonly debug: debug.Debugger = namespaceDebug.extend("rtc", "|");
  constructor(
    private readonly backend: ICollaborationBackend,
    private readonly store: any,
    private readonly contentRef: ContentRef
  ) {}

  join(filePath: string): Observable<MythicAction<string, string, {}>> {
    const actionStream = async (actions$: Subject<MythicAction>) => {
      const replicator = new ActionReplicator(actions$, this.backend, this.store, this.contentRef);
      replicator.subscribe();
      await this.loadModel(actions$);
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
  private async loadModel(actions$: Subject<MythicAction>) {
    try {
      const query = gql`
        query {
          notebook(filePath: "./Default.ipynb") {
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
      const result = await this.backend.execute(query);
      // result.errors[message]
      const notebookData = result!.data!.notebook;
      this.createNotebook(actions$, notebookData);
    } catch (error) {
      this.debug(error);
    }
  }

  private createNotebook(actions$: Subject<MythicAction>, notebookData: any) {
  }
  //#endregion
}
