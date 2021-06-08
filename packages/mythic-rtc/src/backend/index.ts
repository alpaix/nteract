import { DocumentNode, execute, ExecutionResult, GraphQLSchema, subscribe } from "graphql";
import { Maybe } from "graphql/jsutils/Maybe";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { ICollaborationBackend } from "../types";
import { ISolidModel } from "./model";
import { NotebookResolvers } from "./resolvers";

// import queriesSchema from "./schema/gql/queries.gql";
// import mutationsSchema from "./schema/gql/mutations.gql";
// import subscriptionsSchema from "./schema/gql/subscriptions.gql";

// https://github.com/liady/webpack-node-externals
// import { loadSchemaSync } from "@graphql-tools/load";
// import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
// import { loader } from 'graphql.macro';

export class FluidBackend implements ICollaborationBackend {
  private readonly schema!: GraphQLSchema;

  constructor(private readonly solidModel?: ISolidModel) {
    // const queriesSchema = loadSchemaSync("./schema/gql/queries.gql", { loaders: [new GraphQLFileLoader()] });
    // const queriesSchema = loader("./schema/gql/queries.gql");
    // const mutationsSchema = loader("./schema/gql/mutations.gql");
    // const subscriptionsSchema = loader("./schema/gql/subscriptions.gql");
    // const typeDefs = mergeTypeDefs([queriesSchema, mutationsSchema, subscriptionsSchema]);
    // this.schema = makeExecutableSchema({ typeDefs, resolvers: NotebookResolvers });
  }

  execute(document: DocumentNode, variableValues?: Maybe<{ [key: string]: unknown }>): Promise<ExecutionResult> {
    const result = execute({ schema: this.schema, document, variableValues, contextValue: { model: this.solidModel } });
    return Promise.resolve(result);
  }

  subscribe(
    document: DocumentNode,
    variableValues?: Maybe<{ [key: string]: unknown }>
  ): Promise<AsyncIterableIterator<ExecutionResult>> {
    const result = subscribe({
      schema: this.schema,
      document,
      variableValues,
      contextValue: { model: this.solidModel }
    }) as any;
    return Promise.resolve(result);
  }
}
