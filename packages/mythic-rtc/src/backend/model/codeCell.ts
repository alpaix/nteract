import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { ISharedMap, SharedMap } from "@fluidframework/map";
import { SharedObjectSequence, SharedString } from "@fluidframework/sequence";
import { CodeCellInput, MetadataEntryDef } from "../schema";
import { ICellOutput, ICodeCell } from "./types";

const ExecutionCountKey = "executionCount";
const MetadataKey = "metadata";
const OutputsKey = "outputs";
const SourceKey = "source";

/**
 * Fluid DataObject
 */
export class CodeCellDDS extends DataObject<{}, CodeCellInput> implements ICodeCell {
  public static DataObjectName = "code-cell";
  private metadata: ISharedMap | undefined;
  private outputs: SharedObjectSequence<ICellOutput> | undefined;
  private source: SharedString | undefined;

  public static readonly Factory = new DataObjectFactory(
    CodeCellDDS.DataObjectName,
    CodeCellDDS,
    [SharedMap.getFactory(), SharedObjectSequence.getFactory(), SharedString.getFactory()],
    {}
  );

  //#region ISolidCell
  get cellType(): "CodeCell" {
    return "CodeCell";
  }

  getExecutionCount(): number | undefined {
    const executionCount = this.root.get<number>(ExecutionCountKey);
    return executionCount;
  }

  getMetadata(): MetadataEntryDef[] {
    const result: MetadataEntryDef[] = [];
    this.metadata?.forEach((value, key) => result.push({ key, value }));
    return result;
  }

  getOutputs(): ICellOutput[] {
    const result: ICellOutput[] = [];
    this.outputs?.getItems(0).forEach(item => result.push(item));
    return result;
  }

  getSource(): SharedString {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.source!;
  }
  //#endregion

  //#region DataObject
  protected async initializingFirstTime(input?: CodeCellInput): Promise<void> {
    const source = SharedString.create(this.runtime);
    const metadata = SharedMap.create(this.runtime);
    const outputs = SharedObjectSequence.create<ICellOutput>(this.runtime);

    if (input) {
      source.insertText(0, input.source);

      input.metadata?.forEach(({ key, value }) => {
        metadata.set(key, value);
      });

      const mappedOutputs = input.outputs?.map((output) => {
        if ("executeResult" in output) {
          return { ...output.executeResult, type: "ExecuteResult" } as ICellOutput;
        } else if ("displayData" in output) {
          return { ...output.displayData, type: "DisplayData" } as ICellOutput;
        } else if ("stream" in output) {
          return { ...output.stream, type: "StreamOutput" } as ICellOutput;
        } else if ("error" in output) {
          return { ...output.error, type: "ErrorOutput" } as ICellOutput;
        }
        throw new Error("Unsupported cell output type");
      });
      if (mappedOutputs) {
        outputs.insert(0, mappedOutputs);
      }

      this.root.set(ExecutionCountKey, input.executionCount);
    }

    this.root.set(SourceKey, source.handle).set(MetadataKey, metadata.handle).set(OutputsKey, outputs.handle);
  }

  protected async hasInitialized(): Promise<void> {
    // cache frequently accessed properties
    this.source = await this.root.get<IFluidHandle<SharedString>>(SourceKey)?.get();
    this.metadata = await this.root.get<IFluidHandle<SharedMap>>(MetadataKey)?.get();
    this.outputs = await this.root.get<IFluidHandle<SharedObjectSequence<ICellOutput>>>(OutputsKey)?.get();
  }
  //#endregion
}
