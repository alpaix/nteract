/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Subject } from "rxjs";
import { eachValueFrom } from "rxjs-for-await";
import { ResolverContext } from "./context";
import { CellModel, CellOrderEvent, ICellOutput, ICodeCell, INotebookModel } from "./model";
import { InsertCellInput, PatchCellSourceInput, UpsertNotebookInput } from "./schema";

const QueryResolver = {
  notebook: async (parent: never, args: { filePath: string }, context: ResolverContext /*, info: any*/) => {
    const model = await context.shell.getModel();
    return model;
  }
};

const MutationResolver = {
  upsertNotebook: async (parent: unknown, { input }: { input: UpsertNotebookInput }, context: ResolverContext) => {
    // const { filePath } = input;
    const model = await context.shell.upsertModel(input);
    return { notebook: model };
  },
  insertCell: async (parent: unknown, { input }: { input: InsertCellInput }, context: ResolverContext) => {
    const { cell, insertAt } = input;
    const model = await context.shell.getModel();
    const newCell = await model?.insertCell(cell, insertAt);
    return newCell;
  },
  deleteCell: async (parent: unknown, { id: cellId }: { id: string }, context: ResolverContext) => {
    const model = await context.shell.getModel();
    model?.deleteCell(cellId);
    return true;
  },
  patchCellSource: async (parent: unknown, { input }: { input: PatchCellSourceInput }, context: ResolverContext) => {
    const { id: cellId, diff } = input;
    const model = await context.shell.getModel();
    const cell = await model?.getCell(cellId);
    if (cell) {
      const ss = cell.getSource();
      ss.replaceText(0, ss.getLength(), diff);
    }
    return true;
  }
};

const SubscriptionResolver = {
  cellOrder: {
    subscribe: async (parent: unknown, args: unknown, context: ResolverContext) => {
      const model = await context.shell.getModel();
      const order$ = model?.cells$ ?? new Subject();
      return eachValueFrom(order$);
    },
    resolve: (payload: never) => {
      return payload;
    }
  },
  cellSource: {
    subscribe: async (parent: unknown, args: unknown, context: ResolverContext) => {
      const model = await context.shell.getModel();
      const source$ = model?.source$ ?? new Subject();
      return eachValueFrom(source$);
    },
    resolve: (payload: never) => {
      return payload;
    }
  }
};

const NotebookResolver = {
  // async id(model: NotebookDDS) {
  //   return model.id;
  // },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async cells(solidModel: INotebookModel, args: { first: number } /*, context: any, info: any*/) {
    const cells = await solidModel.getCells();
    return {
      edges: [],
      nodes: cells,
      pageInfo: null,
      totalCount: cells.length
    };
  },
  async cell(solidModel: INotebookModel, args: { id: string }) {
    const cell = await solidModel.getCell(args.id);
    return cell;
  }
};

const CellResolver = {
  // async id(cell: CellModel) {
  //   return cell.id;
  // },
  async source(cell: CellModel) {
    return cell.getSource().getText();
  }
};

const CodeCellResolver = {
  ...CellResolver,
  outputs(cell: ICodeCell) {
    return cell.getOutputs();
  }
};

export const NotebookResolvers = {
  Query: QueryResolver,
  Mutation: MutationResolver,
  Subscription: SubscriptionResolver,
  Notebook: NotebookResolver,
  CodeCell: CodeCellResolver,
  MarkdownCell: CellResolver,
  RawCell: CellResolver,
  Cell: {
    __resolveType: ({ cellType }: CellModel) => cellType
  },
  CellOutput: {
    __resolveType: ({ type }: ICellOutput) => type
  },
  CellOrderEvent: {
    __resolveType: ({ event }: CellOrderEvent) => event
  }
};
