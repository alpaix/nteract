import { Observable } from "rxjs";
import { ImmutableCell } from "@nteract/commutable";
import { MythicAction } from "@nteract/myths";
import { IActionRecorder, ICollaborationBackend } from "../types";

export class ActionRecorder implements IActionRecorder {
  constructor(private readonly backend: ICollaborationBackend, private readonly store: any) {}
  recordInsertCell(id: string, insertAt: number, cell: ImmutableCell): Observable<MythicAction<string, string, any>> {
    throw new Error("Method not implemented.");
  }
  recordDeleteCell(id: string): Observable<MythicAction<string, string, any>> {
    throw new Error("Method not implemented.");
  }
  recordCellContent(id: string, value: string): Observable<MythicAction<string, string, any>> {
    throw new Error("Method not implemented.");
  }
}
