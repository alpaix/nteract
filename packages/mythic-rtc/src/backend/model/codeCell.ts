import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { ISharedMap, SharedMap } from "@fluidframework/map";
import { SharedObjectSequence, SharedString } from "@fluidframework/sequence";
import { CodeCellInput } from "../schema";
import { ICodeCell } from "./types";

const SourceKey = "source";
const MetadataKey = "metadata";

/**
 * Fluid DataObject
 */
export class CodeCellDDS extends DataObject<{}, CodeCellInput> implements ICodeCell {
  public static DataObjectName = "code-cell";
  private source: SharedString | undefined;
  private metadata!: ISharedMap;

  public static readonly Factory = new DataObjectFactory(
    CodeCellDDS.DataObjectName,
    CodeCellDDS,
    [SharedMap.getFactory(), SharedObjectSequence.getFactory(), SharedString.getFactory()],
    {}
  );

  //#region ISolidCell
  get cellType(): "code" {
    return "code";
  }

  getSource(): SharedString {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.source!;
  }
  //#endregion

  //#region DataObject
  protected async initializingFirstTime(props?: CodeCellInput): Promise<void> {
    const source = SharedString.create(this.runtime);
    const metadata = SharedMap.create(this.runtime);

    if (props) {
      if (props) {
        source.insertText(0, props.source);
        // props.metadata?.forEach((value, key) => {
        //   metadata.set(key, value);
        // });
      }
    }

    this.root.set(SourceKey, source.handle).set(MetadataKey, metadata.handle);
  }

  protected async hasInitialized(): Promise<void> {
    // cache frequently accessed properties
    this.source = await this.root.get<IFluidHandle<SharedString>>(SourceKey)?.get();
    // this.metadata = await this.root.get<IFluidHandle<SharedMap>>(MetadataKey)!.get();
  }
  //#endregion
}
