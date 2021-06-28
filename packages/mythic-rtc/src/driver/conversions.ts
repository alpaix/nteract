import { ImmutableCodeCell, ImmutableMarkdownCell, ImmutableNotebook, ImmutableRawCell } from "@nteract/commutable";
import { CellInput, MetadataInput, NotebookContentInput } from "../backend/schema";

function makeCodeCellInput(cell: ImmutableCodeCell): CellInput {
  const metadata = [] as MetadataInput[];
  for (const [key, value] of cell.metadata) {
    metadata.push({ key, value: JSON.stringify(value) });
  }
  // const mappedOutputs = cell.outputs
  //   .map((value: ImmutableOutput) => {
  //     return {
  //       value: value.toJS()
  //     } as ICellOutput;
  //   })
  //   .toArray();
  // outputs.insert(0, mappedOutputs);
  return {
    code: {
      source: cell.source,
      executionCount: cell.execution_count,
      metadata
    }
  };
}

function makeMarkdownCellInput(cell: ImmutableMarkdownCell): CellInput {
  const metadata = [] as MetadataInput[];
  for (const [key, value] of cell.metadata) {
    metadata.push({ key, value: JSON.stringify(value) });
  }
  return {
    markdown: {
      source: cell.source,
      metadata
    }
  };
}

function makeRawCellInput(cell: ImmutableRawCell): CellInput {
  const metadata = [] as MetadataInput[];
  for (const [key, value] of cell.metadata) {
    metadata.push({ key, value: JSON.stringify(value) });
  }
  return {
    raw: {
      source: cell.source,
      metadata
    }
  };
}

export function makeContentInput(notebook: ImmutableNotebook): NotebookContentInput {
  const cells = [] as CellInput[];
  for (const cellId of notebook.cellOrder) {
    const cell = notebook.cellMap.get(cellId);
    switch (cell?.cell_type) {
      case "code":
        cells.push(makeCodeCellInput(cell));
        break;
      case "markdown":
        cells.push(makeMarkdownCellInput(cell));
        break;
      case "raw":
        cells.push(makeRawCellInput(cell));
        break;
    }
  }

  const metadata = [] as MetadataInput[];
  for (const [key, value] of notebook.metadata) {
    metadata.push({ key, value: JSON.stringify(value) });
  }

  return { cells, metadata };
}
