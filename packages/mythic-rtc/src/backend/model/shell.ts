import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import namespaceDebug from "../../common/debug";
import { NotebookDDS } from "./notebook";
import { UpsertNotebookInput } from "../schema";

const ModelKey = "model";

export class ShellDDS extends DataObject {
  private readonly debug: debug.Debugger = namespaceDebug.extend("shell", "|");

  public static DataObjectName = "notebook-shell";

  /**
   * The factory defines how to create an instance of the DataObject as well as the
   * dependencies of the DataObject.
   */
  static readonly Factory = new DataObjectFactory(ShellDDS.DataObjectName, ShellDDS, [], {}, [
    NotebookDDS.Factory.registryEntry
  ]);

  async upsertModel(input: UpsertNotebookInput): Promise<NotebookDDS> {
    if (this.root.has(ModelKey)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return (await this.getModel())!;
    } else {
      const component = await NotebookDDS.Factory.createChildInstance(this.context, input.content);
      this.root.set(ModelKey, component.handle);
      return component;
    }
  }

  async getModel(): Promise<NotebookDDS | undefined> {
    const componentHandle = this.root.get<IFluidHandle<NotebookDDS>>(ModelKey);
    const notebookComponent = await componentHandle?.get();
    return notebookComponent;
  }

  //#region DataObject
  protected async initializingFirstTime(): Promise<void> {
    this.debug("Initializing new component");
    // const notebookCell = SharedCell.create(this.runtime);
    // const emptyNotebook = appendCellToNotebook(makeNotebookRecord(), emptyCodeCell);
    // const component = await SolidModel.Factory.createChildInstance(this.context, emptyNotebook);
    // notebookCell.set(component.handle);

    // this.root.set(ModelKey, notebookCell.handle);
  }

  protected async hasInitialized(): Promise<void> {
    this.debug("Component has initialized", this.runtime.documentId);
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
