/* eslint-disable @typescript-eslint/no-unused-vars */
import { Observable, Subject } from "rxjs";
import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { SharedObjectSequence } from "@fluidframework/sequence";
import { ISharedMap, SharedMap, IValueChanged } from "@fluidframework/map";
import { CellDef, CellInput, MetadataEntryDef, NotebookContentInput } from "../schema";
import { CellOrderEvent, ICellSourceEvent, ICell, ISolidModel, CellModel } from "./types";
import { CodeCellDDS } from "./codeCell";
import { TextCellDDS } from "./textCell";

const CellsKey = "cells";
const CellOrderKey = "cellOrder";
const MetadataKey = "metadata";

export class NotebookDDS extends DataObject<{}, NotebookContentInput> implements ISolidModel {
  public static DataObjectName = "notebook-model";
  private cellMap!: ISharedMap;
  private cellOrder!: SharedObjectSequence<string>;
  private metadataMap!: ISharedMap;

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
  //#endregion
}
