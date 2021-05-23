import { Observable } from "rxjs";
import { MythicAction } from "@nteract/myths";
import { ContentRef } from "@nteract/types";
import { ICollaborationBackend, ICollaborationDriver } from "../types";

export class CollaborationDriver implements ICollaborationDriver {
  constructor(
    private readonly backend: ICollaborationBackend,
    private readonly store: any,
    private readonly contentRef: ContentRef
  ) {}

  joinSession(): Observable<MythicAction<string, string, {}>> {
    throw new Error("Method not implemented.");
  }
}
