import Immutable from "immutable";
import { Subject } from "rxjs";
import gql from "graphql-tag";
import { CellId, createCodeCell } from "@nteract/commutable";
import { AppState, ContentRef, NotebookModel } from "@nteract/types";
import { MythicAction } from "@nteract/myths";
import { selectors as coreSelectors, actions as coreActions } from "@nteract/core";
import { CollabRootState, ICollaborationBackend } from "../types";
import { getLocalCellId } from "../selectors";
import { ICellInsertedEvent, ICellRemovedEvent } from "../backend/model";
import { fromCellDef } from "./conversions";

export class ActionReplicator {
  constructor(
    private readonly actions$: Subject<MythicAction>,
    private readonly backend: ICollaborationBackend,
    private readonly store: any, // SolidStore,
    private readonly contentRef: ContentRef,
    private readonly notebookId: string
  ) {}

  subscribe(): Promise<unknown> {
    return Promise.all([this.cellOrderSub(), this.cellSourceSub()]);
  }

  //#region private
  private async cellSourceSub() {
    const query = gql`
      subscription OnCellSourceUpdated {
        cellSource {
          id
          type
          diff
        }
      }
    `;
    const sub = await this.backend.subscribe(query);
    for await (const value of sub) {
      if (value.data && !value.errors) {
        const { id, diff } = value.data.cellSource;
        const localCellId = getLocalCellId(this.state, id);
        this.actions$.next(
          coreActions.updateCellSource({
            id: localCellId,
            contentRef: this.contentRef,
            value: diff,
            origin: "remote"
          } as any)
        );
      }
    }
  }

  private async cellOrderSub() {
    const query = gql`
      subscription OnCellOrderChanged {
        cellOrder {
          __typename
          id
          ... on CellInsertedEvent {
            pos
          }
          ... on CellRemovedEvent {
            pos
          }
          ... on CellMovedEvent {
            posFrom
            posTo
          }
          ... on CellReplacedEvent {
            local
          }
        }
      }
    `;
    const sub = await this.backend.subscribe(query);
    for await (const value of sub) {
      console.log(value);
      if (value.data && !value.errors) {
        const { cellOrder: delta } = value.data;
        switch (delta.__typename) {
          case "CellInsertedEvent":
            await this.mergeInsertCellDelta(delta);
            break;
          case "CellRemovedEvent":
            this.mergeRemoveCellDelta(delta);
            break;
          case "CellMovedEvent":
            // this.mergeMoveCellDelta(delta);
            break;
          case "CellReplacedEvent":
            // this.mergeReplaceCellDelta(dds, delta);
            break;
        }
      }
    }
  }

  /**
   * Merge an insert operation.
   * @param delta The insert message
   */
  private async mergeInsertCellDelta(delta: ICellInsertedEvent) {
    const remoteCellId = delta.id;
    const remoteCell = await this.fetchRemoteCell(remoteCellId);
    if (!remoteCell) {
      return;
    }

    let insertAfterId;
    const cellList = this.getCellList();
    if (delta.pos > 0 && delta.pos <= cellList.size) {
      insertAfterId = cellList.get(delta.pos - 1);
    }

    if (!insertAfterId) {
      // New cell was inserted at index 0, we dispatch the createCellAbove action to simulate the insert
      // Get the first cell ID from redux store and add new cell above it
      const insertBeforeId = cellList.get(0);
      this.actions$.next(
        coreActions.createCellAbove({
          id: insertBeforeId,
          contentRef: this.contentRef,
          cellType: remoteCell.cell_type,
          cell: remoteCell,
          origin: "remote",
          remoteCellId
        } as any)
      );
    } else {
      this.actions$.next(
        coreActions.createCellBelow({
          id: insertAfterId,
          contentRef: this.contentRef,
          cellType: remoteCell.cell_type,
          cell: remoteCell,
          origin: "remote",
          remoteCellId
        } as any)
      );
    }
  }

  /**
   * Merge remote Cell deletion by dispatching deleteCell Redux action
   * @param delta CellRemovedEvent
   */
  private mergeRemoveCellDelta(delta: ICellRemovedEvent) {
    // This returns a range [pos1 ,pos2)
    // We need to find cell at index pos1 from the local redux store and delete it.
    // TODO: Delete range of cells
    const cellList = this.getCellList();
    if (delta.pos >= 0 && delta.pos < cellList.size) {
      const localCellId = cellList.get(delta.pos);
      // Dispatch the Delete Cell Action
      this.actions$.next(
        coreActions.deleteCell({
          id: localCellId,
          contentRef: this.contentRef,
          origin: "remote"
        } as any)
      );
    }
  }

  private async fetchRemoteCell(cellId: string) {
    const query = gql`
      query getCellById($notebookId: ID!, $cellId: ID!) {
        notebook(id: $notebookId) {
          cell(id: $cellId) {
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
      }
    `;
    const result = await this.backend.execute(query, { notebookId: this.notebookId, cellId });

    if (!result.notebook?.cell) {
      console.log(result);
      return null;
    }

    const remoteCell = fromCellDef(result.notebook.cell);
    return remoteCell;
  }

  get state(): CollabRootState & AppState {
    return this.store.getState();
  }

  private getNotebookModel(): NotebookModel | null {
    const model = coreSelectors.model(this.state, {
      contentRef: this.contentRef
    });
    return (model as unknown) as NotebookModel;
  }

  private getCellList(model?: NotebookModel | null): Immutable.List<CellId> {
    model = model || this.getNotebookModel();
    if (model) {
      const cellList = coreSelectors.notebook.cellOrder(model);
      return cellList;
    }
    return Immutable.List<CellId>();
  }
  //#endregion
}
