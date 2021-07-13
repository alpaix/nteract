import * as Immutable from "immutable";
import {
  createCodeCell,
  createMarkdownCell,
  ImmutableCell,
  ImmutableCodeCell,
  ImmutableDisplayData,
  ImmutableExecuteResult,
  ImmutableMarkdownCell,
  ImmutableNotebook,
  ImmutableOutput,
  ImmutableRawCell,
  makeDisplayData,
  makeErrorOutput,
  makeExecuteResult,
  makeNotebookRecord,
  makeStreamOutput,
  MediaBundle
} from "@nteract/commutable";
import {
  CellInput,
  CellOutputDef,
  CodeCellDef,
  MarkdownCellDef,
  MediaBundleEntryDef,
  MediaBundleInput,
  MetadataEntryDef,
  MetadataInput,
  NotebookContentInput,
  NotebookDef,
  OutputInput
} from "../backend/schema";

function makeCodeCellInput(cell: ImmutableCodeCell): CellInput {
  return {
    code: {
      source: cell.source,
      executionCount: cell.execution_count,
      metadata: makeMetadataInput(cell),
      outputs: [...cell.outputs.map(makeOutputInput)]
    }
  };
}

function makeMetadataInput({
  metadata
}: ImmutableNotebook | ImmutableCell | ImmutableExecuteResult | ImmutableDisplayData) {
  if (!metadata) {
    return undefined;
  }
  const input = [] as MetadataInput[];
  for (const [key, value] of metadata) {
    input.push({ key, value: JSON.stringify(value) });
  }
  return input;
}

function makeMediaBundleInput(data: MediaBundle) {
  const input = [] as MediaBundleInput[];
  for (const [key, value] of Object.entries(data)) {
    input.push({ key, value: JSON.stringify(value) });
  }
  return input;
}

function makeOutputInput(output: ImmutableOutput): OutputInput {
  switch (output.output_type) {
    case "display_data":
      return {
        displayData: {
          data: makeMediaBundleInput(output.data),
          metadata: makeMetadataInput(output)
        }
      };
      ;
    case "error":
      return {
        error: {
          ename: output.ename,
          evalue: output.evalue,
          traceback: [...output.traceback]
        }
      };
    case "execute_result":
      return {
        executeResult: {
          data: makeMediaBundleInput(output.data),
          metadata: makeMetadataInput(output),
          executionCount: output.execution_count
        }
      };
    case "stream":
      return {
        stream: {
          name: output.name,
          text: output.text
        }
      };
  }
}

function makeMarkdownCellInput(cell: ImmutableMarkdownCell): CellInput {
  return {
    markdown: {
      source: cell.source,
      metadata: makeMetadataInput(cell)
    }
  };
}

function makeRawCellInput(cell: ImmutableRawCell): CellInput {
  return {
    raw: {
      source: cell.source,
      metadata: makeMetadataInput(cell)
    }
  };
}

export function makeCellInput(cell: ImmutableCell): CellInput {
  switch (cell.cell_type) {
    case "code":
      return makeCodeCellInput(cell);
    case "markdown":
      return makeMarkdownCellInput(cell);
    case "raw":
      return makeRawCellInput(cell);
  }
}

export function makeContentInput(notebook: ImmutableNotebook): NotebookContentInput {
  const cells = [] as CellInput[];
  notebook.cellOrder.map(cellId => notebook.cellMap.get(cellId)).forEach((cell) => {
    if (cell) {
      cells.push(makeCellInput(cell));
    }
  });

  return { cells, metadata: makeMetadataInput(notebook) };
}

function fromMetadataEntries(metadata: MetadataEntryDef[]): Immutable.Map<string, unknown> {
  return Immutable.Map(metadata.map(({ key, value }) => ([key, JSON.parse(value)])));
}

function fromMediaBundleEntries(data: MediaBundleEntryDef[]): MediaBundle {
  return Object.fromEntries(data.map(({ key, value }) => ([key, JSON.parse(value)])));
}

function fromOutputEntries(outputs: CellOutputDef[]): Immutable.List<ImmutableOutput> {
  return Immutable.List(outputs.map(entry => {
    switch (entry.__typename) {
      case "ExecuteResult":
        return makeExecuteResult({
          execution_count: entry.executionCount,
          data: fromMediaBundleEntries(entry.data),
          metadata: fromMetadataEntries(entry.metadata)
        });
      case "DisplayData":
        return makeDisplayData({
          data: fromMediaBundleEntries(entry.data),
          metadata: fromMetadataEntries(entry.metadata)
        });
      case "StreamOutput":
        return makeStreamOutput({ ...entry });
      case "ErrorOutput":
        const { ename, evalue, traceback } = entry;
        return makeErrorOutput({ ename, evalue, traceback: Immutable.List(traceback) });
    }
  }));
}

export function fromCodeCellDef({ source, metadata, executionCount, outputs }: CodeCellDef): ImmutableCodeCell {
  const result = createCodeCell({
    source,
    metadata: fromMetadataEntries(metadata),
    execution_count: executionCount,
    outputs: fromOutputEntries(outputs)
  });
  return result;
}

export function fromMarkdownCellDef({ source, metadata }: MarkdownCellDef): ImmutableMarkdownCell {
  const result = createMarkdownCell({
    source,
    metadata: fromMetadataEntries(metadata)
  });
  return result;
}

// export function makeRawCell({ source, metadata }: MarkdownCellDef): ImmutableRawCell {
//   const result = createRawCell({
//     source,
//     metadata: makeImmutableMetadata(metadata)
//   });
//   return result;
// }

export function fromNotebookDef(notebookDef: NotebookDef): ImmutableNotebook {
  const notebookCells = notebookDef.cells.nodes.map((remoteCell): [string, ImmutableCell] => {
    switch (remoteCell.__typename) {
      case "CodeCell":
        return [remoteCell.id, fromCodeCellDef(remoteCell)];
      case "MarkdownCell":
        return [remoteCell.id, fromMarkdownCellDef(remoteCell)];
      case "RawCell":
        return [remoteCell.id, fromMarkdownCellDef(remoteCell as any)];
    }
  });

  const notebook = makeNotebookRecord({
    nbformat: 4,
    nbformat_minor: 5,
    cellOrder: Immutable.List(notebookCells.map(([id]) => id)),
    cellMap: Immutable.Map(notebookCells),
    metadata: Immutable.Map(fromMetadataEntries(notebookDef.metadata))
  });
  return notebook;
}
