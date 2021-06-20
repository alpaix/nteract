import { DocumentNode, execute, ExecutionResult, GraphQLSchema, subscribe } from "graphql";
import { Maybe } from "graphql/jsutils/Maybe";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { ExecuteError, ExecuteResult, ICollaborationBackend } from "../types";
import { ResolverContext } from "./context";
import { NotebookResolvers } from "./resolvers";

import queriesSchema from "./schema/gql/queries.gql";
import mutationsSchema from "./schema/gql/mutations.gql";
import subscriptionsSchema from "./schema/gql/subscriptions.gql";

// https://github.com/liady/webpack-node-externals
// import { loadSchemaSync } from "@graphql-tools/load";
// import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
// import { loader } from 'graphql.macro';

export class FluidBackend implements ICollaborationBackend {
  private readonly schema: GraphQLSchema;
  private context: ResolverContext | undefined;

  constructor() {
    // const queriesSchema = loadSchemaSync("./schema/gql/queries.gql", { loaders: [new GraphQLFileLoader()] });
    // const queriesSchema = loader("./schema/gql/queries.gql");
    // const mutationsSchema = loader("./schema/gql/mutations.gql");
    // const subscriptionsSchema = loader("./schema/gql/subscriptions.gql");
    const typeDefs = mergeTypeDefs([queriesSchema, mutationsSchema, subscriptionsSchema]);
    this.schema = makeExecutableSchema({ typeDefs, resolvers: NotebookResolvers });
  }
  async start(): Promise<void> {
    const url = `https://localhost:8888/matplotlib-21`; // ${filePath}`;
    this.context = await ResolverContext.create(url);
  }

  async execute(document: DocumentNode, variableValues?: Maybe<{ [key: string]: unknown }>): Promise<ExecuteResult> {
    const valueOrPromise = execute({ schema: this.schema, document, variableValues, contextValue: this.context });
    const result = await Promise.resolve(valueOrPromise);
    if (result.errors) {
      throw new ExecuteError(result.errors);
    }
    return result.data ?? {};
  }

  subscribe(
    document: DocumentNode,
    variableValues?: Maybe<{ [key: string]: unknown }>
  ): Promise<AsyncIterableIterator<ExecutionResult>> {
    const result = subscribe({
      schema: this.schema,
      document,
      variableValues,
      contextValue: this.context
    }) as any;
    return Promise.resolve(result);
  }
}
