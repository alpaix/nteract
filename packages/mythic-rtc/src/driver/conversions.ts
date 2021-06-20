import { ImmutableCodeCell, ImmutableMarkdownCell, ImmutableNotebook, ImmutableRawCell } from "@nteract/commutable";
import { CellInput, NotebookContentInput } from "../backend/schema";

function makeCodeCellInput(cell: ImmutableCodeCell): CellInput {
  // cell.metadata.forEach((value, key) => {
  //   metadata.set(key, value);
  // });
  // executionCount.set(cell.execution_count);
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
      executionCount: cell.execution_count
    }
  };
}

function makeMarkdownCellInput(cell: ImmutableMarkdownCell): CellInput {
  return {
    markdown: {
      source: cell.source
    }
  };
}

function makeRawCellInput(cell: ImmutableRawCell): CellInput {
  return {
    raw: {
      source: cell.source
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

  // cell.metadata.forEach((value, key) => {
  //   metadata.set(key, value);
  // });

  return { cells };
}
