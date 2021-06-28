/* eslint-disable @typescript-eslint/no-unused-vars */
import { Observable, Subject } from "rxjs";
import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { SharedObjectSequence } from "@fluidframework/sequence";
import { ISharedMap, SharedMap, IValueChanged } from "@fluidframework/map";
import { CellDef, CellInput, MetadataEntryDef, NotebookContentInput } from "../schema";
import { CellOrderEvent, ICellSourceEvent, ICell, ISolidModel } from "./types";
import { CodeCellDDS } from "./codeCell";
import { TextCellDDS } from "./textCell";

const CellsKey = "cells";
const MetadataKey = "metadata";

export class NotebookDDS extends DataObject<{}, NotebookContentInput> implements ISolidModel {
  public static DataObjectName = "notebook-model";

  private cells!: SharedObjectSequence<IFluidHandle>;
  private metadata: ISharedMap | undefined;

  public static readonly Factory = new DataObjectFactory(
    NotebookDDS.DataObjectName,
    NotebookDDS,
    [SharedMap.getFactory(), SharedObjectSequence.getFactory()],
    {},
    [CodeCellDDS.Factory.registryEntry, TextCellDDS.Factory.registryEntry]
  );

  //#region ISolidCell
  cells$: Observable<CellOrderEvent> = new Subject();

  source$: Observable<ICellSourceEvent> = new Subject();

  async getCells(): Promise<ICell[]> {
    const componentPromises: Promise<any>[] = [];
    for (const handle of this.cells.getItems(0)) {
      componentPromises.push(handle.get());
    }
    return Promise.all(componentPromises);
  }

  async getCell(id: string): Promise<ICell | undefined> {
    throw new Error("Method not implemented.");
    // const cellHandle = await this.cellMap.get(id);
    // const cellComponent: ISolidCell = await cellHandle.get();
    // return cellComponent;
  }

  async insertCell(cell: CellDef, insertAt: number): Promise<ICell> {
    throw new Error("Method not implemented.");
    // const cellHandle = await this.createCellComponent(cell);
    // this.cellMap.set(cell.id, cellHandle);
    // await this.enlistCell(cell.id, cellHandle);

    // this.cellOrder.insert(insertAt, [cell.id]);

    // const cellComponent = await cellHandle.get();
    // return cellComponent;
  }

  deleteCell(id: string): void {
    throw new Error("Method not implemented.");
    // const removeIndex = this.cellOrder.getItems(0).indexOf(id);
    // if (removeIndex !== -1) {
    //   this.cellOrder.remove(removeIndex, removeIndex + 1);
    // }
    // this.cellMap.delete(id);
  }
  replaceCell(id: string, cell: CellDef): Promise<void> {
    throw new Error("Method not implemented.");
  }
  moveCell(id: string, destId: string, above: boolean): void {
    throw new Error("Method not implemented.");
  }

  async getMetadata(): Promise<MetadataEntryDef[]> {
    const result: MetadataEntryDef[] = [];
    this.metadata?.forEach((value, key) => result.push({ key, value }));
    return result;
  }

  updateMetadata(parent: string, payload: any): void {
    throw new Error("Method not implemented.");
  }
  //#endregion

  //#region DataObject
  protected async initializingFirstTime(input?: NotebookContentInput): Promise<void> {
    // this.debug("Initializing new component");
    const cells = SharedObjectSequence.create<IFluidHandle>(this.runtime);
    const metadata = SharedMap.create(this.runtime);

    if (input) {
      const handles = [];
      for (const cell of input.cells) {
        const cellHandle = await this.createCellComponent(cell);
        if (cellHandle) {
          handles.push(cellHandle);
        }
      }
      cells.insert(0, handles);

      input.metadata?.forEach(({ key, value }) => {
        metadata.set(key, value);
      });
    }

    this.root.set(CellsKey, cells.handle).set(MetadataKey, metadata.handle);
  }

  protected async initializingFromExisting(): Promise<void> {
    // this.debug("Initializing existing component");
  }

  protected async hasInitialized(): Promise<void> {
    // this.debug("Component has initialized", this.runtime.documentId, this.url);
    this.cells = await this.root.get(CellsKey)?.get();
    this.metadata = await this.root.get(MetadataKey)?.get();
  }
  //#endregion

  //#region private
  private async createCellComponent(cell: CellInput): Promise<IFluidHandle | undefined> {
    let component;
    if ("code" in cell) {
      component = await CodeCellDDS.Factory.createChildInstance(this.context, cell.code);
    } else if ("markdown" in cell) {
      component = await TextCellDDS.Factory.createChildInstance(this.context, cell.markdown);
    } else if ("raw" in cell) {
      component = await TextCellDDS.Factory.createChildInstance(this.context, cell.raw);
    }
    return component?.handle;
  }
  //#endregion
}
