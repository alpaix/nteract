import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { ISharedMap, SharedMap } from "@fluidframework/map";
import { SharedObjectSequence, SharedString } from "@fluidframework/sequence";
import { CodeCellInput, MetadataEntryDef } from "../schema";
import { ICodeCell } from "./types";

const SourceKey = "source";
const MetadataKey = "metadata";

/**
 * Fluid DataObject
 */
export class CodeCellDDS extends DataObject<{}, CodeCellInput> implements ICodeCell {
  public static DataObjectName = "code-cell";
  private source: SharedString | undefined;
  private metadata: ISharedMap | undefined;

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

  async getMetadata(): Promise<MetadataEntryDef[]> {
    const result: MetadataEntryDef[] = [];
    this.metadata?.forEach((value, key) => result.push({ key, value }));
    return result;
  }
  //#endregion

  //#region DataObject
  protected async initializingFirstTime(input?: CodeCellInput): Promise<void> {
    const source = SharedString.create(this.runtime);
    const metadata = SharedMap.create(this.runtime);

    if (input) {
      source.insertText(0, input.source);

      input.metadata?.forEach(({ key, value }) => {
        metadata.set(key, value);
      });
    }

    this.root.set(SourceKey, source.handle).set(MetadataKey, metadata.handle);
  }

  protected async hasInitialized(): Promise<void> {
    // cache frequently accessed properties
    this.source = await this.root.get<IFluidHandle<SharedString>>(SourceKey)?.get();
    this.metadata = await this.root.get<IFluidHandle<SharedMap>>(MetadataKey)?.get();
  }
  //#endregion
}
