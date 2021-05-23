import { AppState, epics as coreEpics, reducers } from "@nteract/core";
import { configuration } from "@nteract/mythic-configuration";
import { notifications } from "@nteract/mythic-notifications";
import { collaboration, recordingMiddleware } from "@nteract/mythic-rtc";
import { makeConfigureStore } from "@nteract/myths";
import { compose } from "redux";
import { contents } from "rx-jupyter";

const composeEnhancers =
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const configureStore = makeConfigureStore<AppState>()({
  packages: [configuration, notifications, collaboration],
  reducers: {
    app: reducers.app,
    core: reducers.core as any,
  },
  epics: coreEpics.allEpics,
  epicDependencies: { contentProvider: contents.JupyterContentProvider },
  epicMiddleware: [recordingMiddleware as any],
  enhancer: composeEnhancers,
});
export default configureStore;
