import type {
    BufferToBinary,
    DeleteResult,
    FlattenMaps,
    HydratedDocument,
    MongooseBaseQueryOptions,
    MongooseUpdateQueryOptions,
    ProjectionType, QueryOptions,
    Require_id,
    RootFilterQuery,
    Types, UpdateResult
} from "mongoose";
import type {
    IOTP,
    IUser
} from "../../DB/models/User.model";
import type { IToken } from "../../DB/models/Token.model";

// User Model
export type UserUpdateType = {
    set?: Partial<IUser> | FlattenMaps<Partial<IUser>>;
    unset?: Partial<Record<keyof IUser, true>> | FlattenMaps<Partial<Record<keyof Partial<IUser>, true>>>;
};
export type IDType = Types.ObjectId;
export type UserDoc = HydratedDocument<IUser>;
export type UserDocLean = Require_id<FlattenMaps<BufferToBinary<IUser>>>;
export type UserType = UserDoc | UserDocLean;
export type UpdateResultType = UpdateResult;
export type DeleteResultType = DeleteResult;
export type OTPDoc = HydratedDocument<IOTP>;
export type OTPDocLean = FlattenMaps<IOTP>;
export type OTPType = OTPDoc | OTPDocLean;
export type UserFilterType = RootFilterQuery<IUser>;
export type UserSelectionType = ProjectionType<IUser>;
export type UserOptionsType = QueryOptions<IUser>;
export type UserUpdateOptionsType = MongooseUpdateQueryOptions<IUser>;
export type UserDeletionOptionsType = MongooseBaseQueryOptions<IUser>;

// Token Model
export type TokenUpdateType = {
    set?: Partial<IToken> | Partial<FlattenMaps<IToken>>;
    unset?: Partial<Record<keyof IToken, true>> | Partial<FlattenMaps<Record<keyof IToken, true>>>
};
export type TokenDoc = HydratedDocument<IToken>;
export type TokenDocLean = Require_id<FlattenMaps<BufferToBinary<IToken>>>;
export type TokenFilterType = RootFilterQuery<IToken>;
export type TokenSelectionType = ProjectionType<IToken>;
export type TokenOptionsType = QueryOptions<IToken>;
export type TokenUpdateOptionsType = MongooseUpdateQueryOptions<IToken>;