import Immutable from "immutable";
import { CellId } from "@nteract/commutable";
import { AppState, ContentRef, NotebookModel } from "@nteract/types";
import { selectors as coreSelectors } from "@nteract/core";
import { collaboration } from "../package";
import { CollabRootState, ICollaborationState } from "../types";

export const getCellList = (state: AppState, { contentRef }: { contentRef: ContentRef }): Immutable.List<CellId> => {
  const model = getNotebookModel(state, { contentRef });
  if (model) {
    const cellList = coreSelectors.notebook.cellOrder(model);
    return cellList;
  }
  return Immutable.List<CellId>();
};

export const getNotebookModel = (state: AppState, { contentRef }: { contentRef: ContentRef }): NotebookModel | null => {
  const model = coreSelectors.model(state, {
    contentRef
  });
  if (!model || model.type !== "notebook") {
    return null;
  }

  return (model as unknown) as NotebookModel;
};

const getCellIdMap = collaboration.createSelector((state) => state?.cellIdMap);

export const getRemoteCellId = (state: CollabRootState, localId: string): string | undefined => {
  const idMap = getCellIdMap(state);
  return idMap?.get(localId, undefined);
};

export const getReverseCellIdMap = collaboration.createSelector((state) => state?.reverseCellIdMap);

export const getLocalCellId = (state: CollabRootState, remoteId: string): string | undefined => {
  const idMap = getReverseCellIdMap(state);
  return idMap?.get(remoteId);
};

export const doesCellIdExistInMap = (state: CollabRootState, localId: string): boolean => {
  const idMap = getCellIdMap(state);
  return idMap?.has(localId) ?? false;
};

export const isLoaded = collaboration.createSelector((state) => !!state?.isLoaded);

export const getDriver = collaboration.createSelector((state) => state?.driver);
