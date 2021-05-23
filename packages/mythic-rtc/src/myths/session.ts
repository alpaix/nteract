import { collaboration } from "../package";

export const joinSession = collaboration.createMyth("join")<void>({
  thenDispatch: [(action, state) => state.driver.join()]
});

export const leaveSession = collaboration.createMyth("leave")<void>({
  thenDispatch: [(action, state) => state.driver.leave()]
});

export const joinSessionSucceeded = collaboration.createMyth("join/succeeded")<void>({
  reduce: (state, action) => {
    return state.set("isLoaded", true);
  }
});

export const joinSessionFailed = collaboration.createMyth("join/failed")<void>({
  reduce: (state, action) => {
    return state.set("isLoaded", false);
  }
});
