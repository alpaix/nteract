import { EMPTY, fromEvent, Observable, of, Subject, Subscription } from "rxjs";
import { filter, map, mergeMap } from "rxjs/operators";
import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { ISequencedDocumentMessage } from "@fluidframework/protocol-definitions";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { SequenceDeltaEvent, SharedObjectSequence, SharedString } from "@fluidframework/sequence";
import { ISharedMap, SharedMap } from "@fluidframework/map";
import { CellInput, MetadataEntryDef, NotebookContentInput } from "../schema";
import { CellOrderEvent, ICellSourceEvent, INotebookModel, CellModel, ICellInsertedEvent, ICellRemovedEvent, ICellMovedEvent } from "./types";
import { CodeCellDDS } from "./codeCell";
import { TextCellDDS } from "./textCell";

const CellsKey = "cells";
const CellOrderKey = "cellOrder";
const MetadataKey = "metadata";

export class NotebookDDS extends DataObject<{}, NotebookContentInput> implements INotebookModel {
  public static DataObjectName = "notebook-model";
  private cellMap!: ISharedMap;
  private cellOrder!: SharedObjectSequence<string>;
  private metadataMap!: ISharedMap;
  private readonly subscriptions: Subscription[] = [];

  public static readonly Factory = new DataObjectFactory(
    NotebookDDS.DataObjectName,
    NotebookDDS,
    [SharedMap.getFactory(), SharedObjectSequence.getFactory()],
    {},
    [CodeCellDDS.Factory.registryEntry, TextCellDDS.Factory.registryEntry]
  );

  //#region ISolidModel
  cells$!: Observable<CellOrderEvent>;

  source$ = new Subject<ICellSourceEvent>();

  get metadata(): MetadataEntryDef[] {
    const result: MetadataEntryDef[] = [];
    this.metadataMap?.forEach((value, key) => result.push({ key, value }));
    return result;
  }

  async getCells(): Promise<CellModel[]> {
    const componentPromises: Promise<CellModel>[] =
      this.cellOrder.getItems(0).map((cellId) => {
        const handle = this.cellMap.get(cellId);
        return handle.get();
      });
    return Promise.all(componentPromises);
  }

  async getCell(id: string): Promise<CellModel | undefined> {
    const cellHandle = await this.cellMap.get(id);
    const cellComponent = await cellHandle.get();
    return cellComponent;
  }

  async insertCell(input: CellInput, insertAt: number): Promise<CellModel> {
    const component = await this.createCellComponent(input);
    this.cellMap.set(component.id, component.handle);
    this.cellOrder.insert(insertAt, [component.id]);
    return component;
  }

  deleteCell(id: string): void {
    const removeIndex = this.cellOrder.getItems(0).indexOf(id);
    if (removeIndex !== -1) {
      this.cellOrder.remove(removeIndex, removeIndex + 1);
    }
    this.cellMap.delete(id);
  }

  replaceCell(id: string, cell: CellInput): Promise<void> {
    throw new Error("Method not implemented.");
  }
  moveCell(id: string, destId: string, above: boolean): void {
    throw new Error("Method not implemented.");
  }

  updateMetadata(parent: string, payload: unknown): void {
    throw new Error("Method not implemented.");
  }
  //#endregion

  //#region DataObject
  protected async initializingFirstTime(input?: NotebookContentInput): Promise<void> {
    // this.debug("Initializing new component");
    const cellMap = SharedMap.create(this.runtime);
    const cellOrder = SharedObjectSequence.create<string>(this.runtime);
    const metadataMap = SharedMap.create(this.runtime);

    if (input) {
      const cellIds = [];
      for (const cell of input.cells) {
        const { id, handle } = await this.createCellComponent(cell);
        cellIds.push(id);
        cellMap.set(id, handle);
      }
      cellOrder.insert(0, cellIds);

      input.metadata?.forEach(({ key, value }) => {
        metadataMap.set(key, value);
      });
    }

    this.root
      .set(CellsKey, cellMap.handle)
      .set(CellOrderKey, cellOrder.handle)
      .set(MetadataKey, metadataMap.handle);
  }

  protected async initializingFromExisting(): Promise<void> {
    // this.debug("Initializing existing component");
  }

  protected async hasInitialized(): Promise<void> {
    // this.debug("Component has initialized", this.runtime.documentId, this.url);
    this.cellMap = await this.root.get(CellsKey)?.get();
    this.cellOrder = await this.root.get(CellOrderKey)?.get();
    this.metadataMap = await this.root.get(MetadataKey)?.get();

    await this.setupObservables();
  }
  //#endregion

  //#region private
  private createCellComponent(cell: CellInput) {
    if ("code" in cell) {
      return CodeCellDDS.Factory.createChildInstance(this.context, cell.code);
    } else if ("markdown" in cell) {
      return TextCellDDS.Factory.createChildInstance(this.context, cell.markdown);
    } else if ("raw" in cell) {
      return TextCellDDS.Factory.createChildInstance(this.context, cell.raw);
    }
    throw new Error("Unsupported cell input type");
  }

  private async setupObservables() {
    this.cells$ = fromEvent<[ISequencedDocumentMessage, boolean]>(this.cellOrder, "op").pipe(
      filter(([, local]) => !local),
      mergeMap(([op]) => {
        const delta = op.contents;
        // TODO: use partition operator
        switch (delta.type) {
          case 0: // MergeTreeDeltaType.INSERT:
            if (typeof delta.pos1 === "number" && delta.seg && delta.seg.items instanceof Array) {
              // TODO: Insert a range of cells
              const newCellId = delta.seg.items[0];
              return of<ICellInsertedEvent>({ event: "CellInsertedEvent", id: newCellId, pos: delta.pos1 });
            }
            break;
          case 1: // MergeTreeDeltaType.REMOVE:
            if (typeof delta.pos1 === "number" && typeof delta.pos2 === "number") {
              // This returns a range [pos1 ,pos2)
              // TODO: Delete a range of cells
              return of<ICellRemovedEvent>({ event: "CellRemovedEvent", pos: delta.pos1 });
            }
            break;
          case 3: // MergeTreeDeltaType.GROUP:
            if (delta && delta.ops instanceof Array && delta.ops.length === 2) {
              // We represent a Move Cell Op using a group op combining 2 ops
              // 1. RemoveOp to delete the source ID
              // 2. InsertOp to insert the source ID at the destination
              const removeOp = delta.ops[0];
              const insertOp = delta.ops[1];
              return of<ICellMovedEvent>({ event: "CellMovedEvent", pos1: removeOp.pos1, pos2: insertOp.pos1 });
            }
            break;
        }
        return EMPTY;
      })
    );

    this.subscriptions.push(
      this.cells$.subscribe(async (event) => {
        if (event.event == "CellInsertedEvent") {
          const cellHandle = await this.cellMap.get(event.id);
          await this.enlistCell(event.id, cellHandle);
        }
      })
    );

    for (const [cellId, cellHandle] of this.cellMap.entries()) {
      await this.enlistCell(cellId, cellHandle);
    }
  }

  private async enlistCell(cellId: string, cellHandle: IFluidHandle<any>) {
    const cell: CellModel = await cellHandle.get();
    const ss$ = fromEvent<[SequenceDeltaEvent, SharedString]>(cell.getSource(), "sequenceDelta").pipe(
      filter(([event]) => !event.isLocal),
      map(([, ss]) => ({ id: cellId, type: "replace", diff: ss.getText() } as ICellSourceEvent))
    );
    this.subscriptions.push(ss$.subscribe(this.source$));
  }
  //#endregion
}
