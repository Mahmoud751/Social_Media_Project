import { GraphQLObjectType, GraphQLSchema } from "graphql";
import authGQLSchema from "./schema/auth.schema";
import userGQLSchema from "../graphql/schema/user.schema";
import postGQLSchema from "./schema/post.schema";

// Query => GET
const query = new GraphQLObjectType({
    name: "RootQueryName",
    fields: {
        ...authGQLSchema.registerQuery(),
        ...userGQLSchema.registerQuery(),
        ...postGQLSchema.registerQuery()
    },
    description: "This Is The Root Query Description"
});

// Mutation => PUT | PATCH | DELETE | POST
const mutation = new GraphQLObjectType({
    name: "RootMutationName",
    fields: {
        ...authGQLSchema.registerMutation(),
        ...userGQLSchema.registerMutation(),
        ...postGQLSchema.registerMutation()
    },
    description: "This Is The Root Mutation Description"
});

// GraphQL Schema
export const graphQLSchema = new GraphQLSchema({ query, mutation });