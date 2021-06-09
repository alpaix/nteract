import { ContentRef } from "@nteract/types";
import { CollaborationDriver } from "../driver";
import { FluidBackend } from "../backend";
import { collaboration } from "../package";
import { ICollaborationBackend } from "../types";

export const initCollaboration = collaboration.createMyth("init")<{
  store: any;
  backend?: ICollaborationBackend;
  contentRef: ContentRef;
}>({
  reduce: (state, action) => {
    const { store: theAppStore, contentRef } = action.payload;
    const backend = action.payload.backend ?? new FluidBackend();
    const driver = new CollaborationDriver(backend, theAppStore, contentRef);
    // const recorder = new ActionRecorder(backend, theAppStore);
    // return state.set("driver", driver).set("recorder", recorder);
    return state.set("driver", driver);
  }
});
