import { GraphQLInt, GraphQLString } from "graphql";
import { GraphQLGenderEnumType } from "../types/user.types";

export const login = {
    email: { type: GraphQLString },
    password: { type: GraphQLString }
};

export const signup = {
    ...login,
    username: { type: GraphQLString },
    age: { type: GraphQLInt },
    gender: { type: GraphQLGenderEnumType },
    phone: { type: GraphQLString }
};

export const signupWithGmail = {
    idToken: { type: GraphQLString }
};

export const resendConfirmEmail = {
    email: { type: GraphQLString }
};

export const confirmEmail = {
    ...resendConfirmEmail,
    otp: { type: GraphQLString }
};

export const loginWithGmail = signupWithGmail;

export const signWithGmail = signupWithGmail;

export const twoSVLoginConfirmation = confirmEmail;