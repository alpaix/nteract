import * as Immutable from "immutable";
import { ContentRef } from "@nteract/types";
import { createMythicPackage } from "@nteract/myths";
import { IActionRecorder, ICollaborationBackend, ICollaborationDriver, ICollaborationState } from "./types";
import { ActionRecorder, CollaborationDriver } from "./driver";
import { FluidBackend } from "./backend";

export const collaboration = createMythicPackage("collaboration")<ICollaborationState>({
  initialState: {
    isLoaded: false,
    driver: (null as unknown) as ICollaborationDriver,
    recorder: (null as unknown) as IActionRecorder,
    cellIdMap: Immutable.Map(),
    reverseCellIdMap: Immutable.Map()
  }
});

export const initCollaboration = collaboration.createMyth("init")<{
  store: any;
  backend?: ICollaborationBackend;
  contentRef: ContentRef;
}>({
  reduce: (state, action) => {
    const { store: theAppStore, contentRef } = action.payload;
    const backend = action.payload.backend ?? new FluidBackend();
    const driver = new CollaborationDriver(backend, theAppStore, contentRef);
    const recorder = new ActionRecorder(backend, theAppStore);
    return state.set("driver", driver).set("recorder", recorder);
  }
});
