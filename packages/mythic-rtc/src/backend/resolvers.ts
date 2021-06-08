import { eachValueFrom } from "rxjs-for-await";
import { CellOrderEvent, ISolidCell, ISolidModel } from "./model";

const QueryResolver = {
  notebook: async (parent: any, args: { filePath: string }, context: { model: ISolidModel } /*, info: any*/) => {
    return context.model;
  }
};

const MutationResolver = {
  upsertNotebook: async (parent: any, { input }: any, context: { model: ISolidModel }) => {
    const { cell, insertAt } = input;
    const newCell = await context.model.insertCell(cell, insertAt);
    return { id: newCell.id };
  },
  insertCell: async (parent: any, { input }: any, context: { model: ISolidModel }) => {
    const { cell, insertAt } = input;
    const newCell = await context.model.insertCell(cell, insertAt);
    return { id: newCell.id };
  },
  deleteCell: (parent: any, { id: cellId }: any, context: { model: ISolidModel }) => {
    context.model.deleteCell(cellId);
    return true;
  },
  patchCellSource: async (parent: any, { input }: any, context: { model: ISolidModel }) => {
    const { id: cellId, diff } = input;
    const cell = await context.model.getCell(cellId);
    if (cell) {
      const ss = cell.getSource();
      ss.replaceText(0, ss.getLength(), diff);
    }
    return true;
  }
};

const SubscriptionResolver = {
  cellOrder: {
    subscribe: (parent: any, args: any, context: { model: ISolidModel }) => {
      const order$ = context.model.cells$;
      return eachValueFrom(order$);
    },
    resolve: (payload: any) => {
      return payload;
    }
  },
  cellSource: {
    subscribe: (parent: any, args: any, context: { model: ISolidModel }) => {
      const source$ = context.model.source$;
      return eachValueFrom(source$);
    },
    resolve: (payload: any) => {
      return payload;
    }
  }
};

const NotebookResolver = {
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
  async id(solidCell: ISolidCell) {
    return solidCell.id;
  },
  async source(solidCell: ISolidCell) {
    return solidCell.getSource().getText();
  }
};

export const NotebookResolvers = {
  Query: QueryResolver,
  Mutation: MutationResolver,
  Subscription: SubscriptionResolver,
  Notebook: NotebookResolver,
  CodeCell: CellResolver,
  Cell: {
    __resolveType(solidCell: ISolidCell) {
      return "CodeCell"; // solidCell.type???
    }
  },
  CellOrderEvent: {
    __resolveType: ({ event }: CellOrderEvent) => event
  }
};
