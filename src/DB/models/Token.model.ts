import type {
    FlattenMaps,
    HydratedDocument,
    MongooseUpdateQueryOptions,
    ProjectionType,
    QueryOptions,
    RootFilterQuery,
} from "mongoose";
import {
    Schema,
    Types,
    model,
    models,
} from 'mongoose';
import { IDType } from "./User.model";


export interface IToken {
    jti: string,
    expiresIn: number,
    userId: Types.ObjectId
};

export type TokenUpdateType = {
    set?: Partial<IToken> | Partial<FlattenMaps<IToken>>;
    unset?: Partial<Record<keyof IToken, true>> | Partial<FlattenMaps<Record<keyof IToken, true>>>

};
export type TokenDoc = HydratedDocument<IToken>;
export type TokenDocLean = FlattenMaps<IToken> & IDType;
export type TokenFilterType = RootFilterQuery<IToken>;
export type TokenSelectionType = ProjectionType<IToken>;
export type TokenOptionsType = QueryOptions<IToken>;
export type TokenUpdateOptionsType = MongooseUpdateQueryOptions<IToken>;

const tokenSchema = new Schema({
    jti: {
        type: String,
        required: true,
        unique: true
    },
    expiresIn: {
        type: Number,
        required: true,
    },
    userId: {
        type: Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
});

export const Token = models.Token || model<IToken>("Token", tokenSchema);