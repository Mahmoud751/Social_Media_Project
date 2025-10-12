import { GraphQLError } from "graphql";
import { ZodType } from "zod";

export const validationGraphQL = <T = any>(schema: ZodType, args: T) => {
    const validationResult = schema.safeParse(args);
    if (!validationResult.success) {
        throw new GraphQLError("Validation_Error", {
            extensions: {
                statusCode: 400,
                key: "args",
                details: JSON.parse(validationResult.error.message).map((element: any) => {
                    return { path: element.path, message: element.message };
                })
            }
        });
    }
};