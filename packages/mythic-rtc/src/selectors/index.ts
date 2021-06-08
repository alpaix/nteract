import Immutable from "immutable";
import { CellId } from "@nteract/commutable";
import { AppState, ContentRef, NotebookModel } from "@nteract/types";
import { selectors as coreSelectors } from "@nteract/core";
import { collaboration } from "../package";

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

export const getRemoteCellId = (state: any, localId: string) => {
  const idMap = getCellIdMap(state);
  return idMap?.get(localId);
};

export const getReverseCellIdMap = collaboration.createSelector((state) => state!.reverseCellIdMap);

export const getLocalCellId = (state: any, remoteId: string) => {
  const idMap = getReverseCellIdMap(state);
  return idMap!.get(remoteId);
};

/**
 * Checks if entry exists for local cell Id in the cellIdMap
 * @param state Redux state
 * @param localId local cell Id
 */
export const doesCellIdExistInMap = (state: any, localId: string) => {
  const idMap = getCellIdMap(state);
  return idMap ? idMap.has(localId) : false;
};

export const isLoaded = collaboration.createSelector((state) => !!state?.isLoaded);

export const getDriver = collaboration.createSelector((state) => state?.driver);
