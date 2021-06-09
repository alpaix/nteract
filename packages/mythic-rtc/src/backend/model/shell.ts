import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { ISharedCell, SharedCell } from "@fluidframework/cell";
import namespaceDebug from "../../common/debug";

const ModelKey = "model-cell";

export class NotebookShell extends DataObject {
  private readonly debug: debug.Debugger = namespaceDebug.extend("shell", "|");
  private notebookSlot: ISharedCell | undefined;

  public static get DataObjectName(): string {
    return "notebook-shell";
  }

  /**
   * The factory defines how to create an instance of the DataObject as well as the
   * dependencies of the DataObject.
   */
  static readonly Factory = new DataObjectFactory(
    NotebookShell.DataObjectName,
    NotebookShell,
    [SharedCell.getFactory()],
    {},
    [/*SolidModel.Factory.registryEntry*/]
  );

  async upsertModel(): Promise<void> {
    this.debug("Upsert model");
  }

//   async getModel(): Promise<ISolidModel | undefined> {
//     const componentHandle: IFluidHandle<SolidModel> = this.notebookSlot.get();
//     if (componentHandle) {
//       const notebookComponent = await componentHandle.get();
//       return notebookComponent;
//     }
//     return undefined;
//   }

  //#region DataObject
  protected async initializingFirstTime(): Promise<void> {
    this.debug("Initializing new component");
    const notebookCell = SharedCell.create(this.runtime);

    // const emptyNotebook = appendCellToNotebook(makeNotebookRecord(), emptyCodeCell);
    // const component = await SolidModel.Factory.createChildInstance(this.context, emptyNotebook);
    // notebookCell.set(component.handle);

    this.root.set(ModelKey, notebookCell.handle);
  }

  protected async hasInitialized(): Promise<void> {
    this.debug("Component has initialized", this.runtime.documentId);
    this.notebookSlot = await this.root.get<IFluidHandle<SharedCell>>(ModelKey)?.get();

    // const solidModel = await this.getModel();
  }

  public dispose(): void {
    this.debug("Disposing component");
    super.dispose();
  }
  //#endregion

  //#region private
  //#endregion
}
