import {
    GraphQLBoolean,
    GraphQLEnumType,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString
} from "graphql";
import { GraphQLDateType, GraphQLIDType, ResponseStatusType } from "./types";
import { Gender, Provider, Role } from "../../../DB/models/user.model";
import { PostGQLType } from "./post.types";

export const GraphQLGenderEnumType = new GraphQLEnumType({
    name: "GenderEnumType",
    description: "This Is The GenderEnumType Description",
    values: {
        male: {
            value: Gender.male,
            description: "This Is The Male Value Enum"
        },
        female: {
            value: Gender.female,
            description: "This Is The Female Value Enum"
        }
    }
});

export const GraphQLRoleEnumType = new GraphQLEnumType({
    name: "RoleEnumType",
    description: "This Is The RoleEnumType Description",
    values: {
        super_admin: {
            value: Role.super_admin
        },
        admin: {
            value: Role.admin
        },
        user: {
            value: Role.user
        }
    }
});

export const GraphQLProviderEnumType = new GraphQLEnumType({
    name: "ProviderEnumType",
    description: "This Is The ProviderEnumType Description",
    values: {
        system: {
            value: Provider.system
        },
        google: {
            value: Provider.google
        }
    }
});

export const OTPGQLType = new GraphQLObjectType({
    name: "OTPType",
    fields: {
        otp: { type: GraphQLString },
        count: { type: GraphQLInt },
        expiredAt: { type: GraphQLDateType },
        banUntil: { type: GraphQLDateType }
    }
});

export const UserGQLType = new GraphQLObjectType({
    name: "UserDocType",
    fields: {
        _id: { type: GraphQLIDType },
        firstName: { type: GraphQLString },
        lastName: { type: GraphQLString },
        username: { type: GraphQLString },
        slug: { type: GraphQLString },
        email: { type: GraphQLString },
        confirmOtp: { type: OTPGQLType },
        age: { type: GraphQLInt },
        phone: { type: GraphQLString },
        address: { type: GraphQLString },
        password: { type: GraphQLString },
        resetPasswordOtp: { type: OTPGQLType },
        confirmEmail: { type: GraphQLDateType },
        picture: { type: OTPGQLType },
        coverPictures: { type: new GraphQLList(GraphQLString) },
        friends: { type: new GraphQLList(GraphQLIDType) },
        blockList: { type: new GraphQLList(GraphQLIDType) },
        createdAt: { type: GraphQLDateType },
        updatedAt: { type: GraphQLDateType },
        freezedAt: { type: GraphQLDateType },
        freezedBy: { type: GraphQLIDType },
        restoredAt: { type: GraphQLDateType },
        restoredBy: { type: GraphQLIDType },
        provider: { type: GraphQLProviderEnumType},
        changeCredentialsTime: { type: GraphQLDateType },
        two_step_verification: { type: OTPGQLType },
        tempEmail: { type: GraphQLString},
        twoSV: { type: GraphQLBoolean },
        gender: { type: GraphQLGenderEnumType},
        role: { type: GraphQLRoleEnumType }
    }
});

export const welcome = new GraphQLNonNull(GraphQLString);

export const dashboard = new GraphQLObjectType({
    name: "DashboardResponseType",
    fields: {
        ...ResponseStatusType,
        data: {
            type: new GraphQLObjectType({
                name: "DashboardData",
                fields: {
                    users: { type: new GraphQLList(UserGQLType) },
                    posts: { type: new GraphQLList(PostGQLType) }
                }
            })
        }
    }
});