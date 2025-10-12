import { GraphQLObjectType, GraphQLString, GraphQLUnionType } from "graphql";
import { ResponseStatusType } from "./types";
import { UserGQLType } from "./user.types";

export const login = new GraphQLObjectType({
    name: "LoginResponseType",
    description: "This Is The CredentialsResponseType Description",
    fields: {
        ...ResponseStatusType,
        data: {
            type: new GraphQLObjectType({
                name: "Credentails",
                fields: {
                    credentials: {
                        type: new GraphQLObjectType({
                            name: "CredentialType",
                            fields: {
                                access_token: { type: GraphQLString },
                                refresh_token: { type: GraphQLString }
                            }
                        })
                    }
                }
            })
        }
    }
});

export const signup = new GraphQLObjectType({
    name: "SignupResponseType",
    description: "This Is The SignupResponseType Description",
    fields: {
        ...ResponseStatusType,
        data: {
            type: new GraphQLObjectType({
                name: "UserData",
                fields: {
                    user: { type: UserGQLType }
                }
            })
        }
    }
});

export const confirmEmail = new GraphQLObjectType({
    name: "ConfirmEmail",
    description: "This Is The ConfirmEmail Description",
    fields: {
        ...ResponseStatusType
    }
});

export const resendConfirmEmail = new GraphQLObjectType({
    name: "resendConfirmEmail",
    description: "This Is The resendConfirmEmail Description",
    fields: {
        ...ResponseStatusType
    }
});

export const signWithGmail = new GraphQLUnionType({
    name: "SignWithGmail",
    description: "This Is The SignWithGmail Description",
    types: [signup, login]
});

export const loginWithGmail = login;

export const twoSVLoginConfirmation = login;

export const signupWithGmail = signup;
