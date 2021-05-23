import Immutable from "immutable";
import { CellId } from "@nteract/commutable";
import { AppState, ContentRef, NotebookModel } from "@nteract/types";
import { selectors as coreSelectors } from "@nteract/core";

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
