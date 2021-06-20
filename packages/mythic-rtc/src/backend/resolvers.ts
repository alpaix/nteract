/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Subject } from "rxjs";
import { eachValueFrom } from "rxjs-for-await";
import { ResolverContext } from "./context";
import { CellModel, CellOrderEvent, ISolidModel } from "./model";
import { NotebookDDS } from "./model/notebook";
import { UpsertNotebookInput } from "./schema";

const QueryResolver = {
  notebook: async (parent: any, args: { filePath: string }, context: ResolverContext /*, info: any*/) => {
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
  insertCell: async (parent: any, { input }: any, context: ResolverContext) => {
    const { cell, insertAt } = input;
    const model = await context.shell.getModel();
    const newCell = await model?.insertCell(cell, insertAt);
    return { id: newCell?.id };
  },
  deleteCell: async (parent: any, { id: cellId }: any, context: ResolverContext) => {
    const model = await context.shell.getModel();
    model?.deleteCell(cellId);
    return true;
  },
  patchCellSource: async (parent: any, { input }: any, context: ResolverContext) => {
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
    subscribe: async (parent: any, args: any, context: ResolverContext) => {
      const model = await context.shell.getModel();
      const order$ = model?.cells$ ?? new Subject();
      return eachValueFrom(order$);
    },
    resolve: (payload: any) => {
      return payload;
    }
  },
  cellSource: {
    subscribe: async (parent: any, args: any, context: ResolverContext) => {
      const model = await context.shell.getModel();
      const source$ = model?.source$ ?? new Subject();
      return eachValueFrom(source$);
    },
    resolve: (payload: any) => {
      return payload;
    }
  }
};

const NotebookResolver = {
  async id(model: NotebookDDS) {
    return model.id;
  },
  async cells(solidModel: ISolidModel, args: { first: number } /*, context: any, info: any*/) {
    const cells = await solidModel.getCells();
    return {
      edges: [],
      nodes: cells,
      pageInfo: null,
      totalCount: cells.length
    };
  },
  async cell(solidModel: ISolidModel, args: { id: string }) {
    const cell = await solidModel.getCell(args.id);
    return cell;
  }
};

const CellResolver = {
  async id(cell: CellModel) {
    return cell.id;
  },
  async source(cell: CellModel) {
    return cell.getSource().getText();
  }
};

export const NotebookResolvers = {
  Query: QueryResolver,
  Mutation: MutationResolver,
  Subscription: SubscriptionResolver,
  Notebook: NotebookResolver,
  CodeCell: CellResolver,
  MarkdownCell: CellResolver,
  RawCell: CellResolver,
  Cell: {
    __resolveType(cell: CellModel) {
      switch (cell.cellType) {
        case "code":
          return "CodeCell";
        case "markdown":
          return "MarkdownCell";
        case "raw":
        default:
          return "RawCell";
      }
    }
  },
  CellOrderEvent: {
    __resolveType: ({ event }: CellOrderEvent) => event
  }
};
