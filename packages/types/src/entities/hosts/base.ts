import { HostId } from "../../ids";
import { Observable } from "rxjs";

/**
 * A set of common attributes for both local and remote Jupyter
 * targets.
 */
export interface BaseHostProps {
  id?: HostId | null;
  defaultKernelName: string;
  bookstoreEnabled?: boolean;
  showHeaderEditor?: boolean;
}

/**
 * An RxJS operator for determining if the host that is currently
 * set as the current host in the state is of a particular type.
 *
 * @param hostType  The host type to filter by
 */
export const ofHostType = (...hostTypes: Array<string | [string]>) => (
  source: Observable<any>
) => {
  // Switch to the splat mode
  if (hostTypes.length === 1 && Array.isArray(hostTypes[0])) {
    return ofHostType(...(hostTypes[0] as [string]));
  }
  return new Observable((observer: any) =>
    source.subscribe({
      next(state) {
        const host = state.core.app.host;
        if (host && hostTypes.indexOf(host.type) !== -1) {
          return observer.next(state);
        }
      },
      error(err) {
        observer.error(err);
      },
      complete() {
        observer.complete();
      }
    })
  );
};
