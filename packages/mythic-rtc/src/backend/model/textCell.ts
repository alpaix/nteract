import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { ISharedMap, SharedMap } from "@fluidframework/map";
import { SharedString } from "@fluidframework/sequence";
import { TextCellInput } from "../schema";
import { IMarkdownCell } from "./types";

const SourceKey = "source";
const MetadataKey = "metadata";

/**
 * Fluid DataObject
 */
export class TextCellDDS extends DataObject<{}, TextCellInput> implements IMarkdownCell {
  public static DataObjectName = "text-cell";
  private source: SharedString | undefined;
  private metadata!: ISharedMap;

  public static readonly Factory = new DataObjectFactory(
    TextCellDDS.DataObjectName,
    TextCellDDS,
    [SharedMap.getFactory(), SharedString.getFactory()],
    {}
  );

  //#region ISolidCell
  get cellType(): "markdown" {
    return "markdown";
  }

  getSource(): SharedString {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.source!;
  }
  //#endregion

  //#region DataObject
  protected async initializingFirstTime(props?: TextCellInput): Promise<void> {
    const source = SharedString.create(this.runtime);
    const metadata = SharedMap.create(this.runtime);

    if (props) {
      source.insertText(0, props.source);
      // props.metadata?.forEach((value, key) => {
      //   metadata.set(key, value);
      // });
    }

    this.root.set(SourceKey, source.handle).set(MetadataKey, metadata.handle);
  }

  protected async hasInitialized(): Promise<void> {
    this.source = await this.root.get<IFluidHandle<SharedString>>(SourceKey)?.get();
    // this.metadata = await this.root.get<IFluidHandle<SharedMap>>(MetadataKey)!.get();
  }
  //#endregion
}
