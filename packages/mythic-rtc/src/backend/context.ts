import { Container } from "@fluidframework/container-loader";
import { loadContainer } from "./loader";
import { ISolidModel, NotebookShell } from "./model";
export class ResolverContext {
  model: ISolidModel | undefined;

  static async create(url: string): Promise<ResolverContext> {
    const [container, shell] = await loadContainer(url);
    return new ResolverContext(container, shell);
  }

  private constructor(private readonly container: Container, public readonly shell: NotebookShell) {}
}
