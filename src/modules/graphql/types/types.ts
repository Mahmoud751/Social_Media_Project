import {
    GraphQLError,
    GraphQLInt,
    GraphQLScalarType,
    GraphQLString,
    Kind
} from "graphql";
import type { IDType } from "../../../utils/types/mongoose.types";
import { isValidObjectId, Types } from "mongoose";

export interface IResponse<T = any> {
    message: string,
    statusCode: number,
    data?: T
};

export const getResponseType = (
    data: any = null,
    message: GraphQLScalarType<string, string> = GraphQLString,
    statusCode: GraphQLScalarType<number, number> = GraphQLInt
) => {
    return { message, statusCode, data };
};

export const ResponseStatusType = {
    message: { type: GraphQLString },
    statusCode: { type: GraphQLInt },
};

export const GraphQLIDType = new GraphQLScalarType({
    name: "IDType",
    description: "This Is The IDType Description",

    // Serialize Value Sent To The Client
    serialize: (value): string => {
        if (value instanceof Types.ObjectId) {
            return value.toHexString();
        }
        throw new GraphQLError("Invalid ID Type!", {
            extensions: {
                statusCode: 500
            }
        });
    },

    // Parse Value From The Client
    parseValue: (value): IDType => {
        if (typeof value !== "string" || !isValidObjectId(value)) {
            throw new GraphQLError("Invalid ID Type", {
                extensions: {
                    statusCode: 400
                }
            })
        }
        return Types.ObjectId.createFromHexString(value);
    },

    // Value From Inline GraphQL Query Literals
    parseLiteral: (ast): IDType => {
        if (ast.kind !== Kind.STRING || !isValidObjectId(ast.value)) {
            throw new GraphQLError("Invalid ID Type", {
                extensions: {
                    statusCode: 400
                }
            });
        }
        return Types.ObjectId.createFromHexString(ast.value);
    }
});

export const GraphQLDateType = new GraphQLScalarType({
    name: "DateType",
    description: "This Is The DateType Description",

    // Serialize Value Sent To The Client
    serialize: (value): string => {
        if (value instanceof Date) {
            return value.toISOString();
        }
        throw new GraphQLError("Invalid Date Type", {
            extensions: {
                statusCode: 500
            }
        });
    },

    // Parse Value From The Client
    parseValue: (value): Date => {
        const date = new Date(value as string);
        if (isNaN(date.getTime())) {
            throw new GraphQLError("Invalid Date Type", {
                extensions: {
                    statusCode: 400
                }
            });
        }
        return date;
    },

    // Value From Inline GraphQL Query Literals
    parseLiteral: (ast): Date => {
        if (ast.kind === Kind.STRING) {
            const date = new Date(ast.value);
            if (isNaN(date.getTime())) {
                throw new GraphQLError("Invalid Date");
            }
            return date;
        }
        throw new GraphQLError("Date Scalare Can Only Parse String Values!");
    }
});