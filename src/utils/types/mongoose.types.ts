import type {
    BufferToBinary,
    CreateOptions,
    Cursor,
    DeleteResult,
    FlattenMaps,
    HydratedDocument,
    MongooseBaseQueryOptions,
    MongooseUpdateQueryOptions,
    ProjectionType, QueryOptions,
    Require_id,
    RootFilterQuery,
    Types, Unpacked, UpdateQuery, UpdateResult,
    UpdateWithAggregationPipeline
} from "mongoose";
import type {
    IOTP,
    IUser
} from "../../DB/models/user.model";
import { IFriendRequest } from "../../DB/models/friendRequest.model";
import { IToken } from "../../DB/models/token.model";
import { IPost } from "../../DB/models/post.model";
import { IComment } from "../../DB/models/comment.model";
import { IChat } from "../../DB/models/chat.model";

// General DB Types
export type PaginatedDocType<T> = {
    docsCount: number;
    pages: number
    limit: number;
    documents: Doc<T>[] | LeanDoc<T>[];
};
export type UpdateType<T> = UpdateQuery<T> | UpdateWithAggregationPipeline;
export type Doc<T> = HydratedDocument<T>;
export type LeanDoc<T> = Require_id<FlattenMaps<BufferToBinary<T>>>;
export type FilterType<T> = RootFilterQuery<T>;
export type SelectionType<T> = ProjectionType<T>;
export type OptionsType<T> = QueryOptions<T> & { paranoid?: boolean };
export type UpdateOptionsType<T> = MongooseUpdateQueryOptions<T> & { paranoid?: boolean };
export type DeletionOptionsType<T> = MongooseBaseQueryOptions<T>;
export type UpdateResultType = UpdateResult;
export type DeleteResultType = DeleteResult;
export type CreateOptionsType = CreateOptions;

// User Model
export type UserUpdateType = UpdateQuery<IUser> | UpdateWithAggregationPipeline;
export type IDType = Types.ObjectId;
export type UserDoc = HydratedDocument<IUser>;
export type UserDocLean = Require_id<FlattenMaps<BufferToBinary<IUser>>>;
export type UserType = UserDoc | UserDocLean;
export type OTPDoc = HydratedDocument<IOTP>;
export type OTPDocLean = FlattenMaps<BufferToBinary<IOTP>>;
export type OTPType = OTPDoc | OTPDocLean;
export type UserFilterType = RootFilterQuery<IUser>;
export type UserSelectionType = ProjectionType<IUser>;
export type UserOptionsType = QueryOptions<IUser> & { paranoid?: boolean };
export type UserUpdateOptionsType = MongooseUpdateQueryOptions<IUser> & { paranoid?: boolean };
export type UserDeletionOptionsType = MongooseBaseQueryOptions<IUser> & { paranoid?: boolean };

// Token Model
export type TokenUpdateType = UpdateQuery<IToken> | UpdateWithAggregationPipeline;
export type TokenDoc = HydratedDocument<IToken>;
export type TokenDocLean = Require_id<FlattenMaps<BufferToBinary<IToken>>>;
export type TokenFilterType = RootFilterQuery<IToken>;
export type TokenSelectionType = ProjectionType<IToken>;
export type TokenOptionsType = QueryOptions<IToken> & { paranoid?: boolean };
export type TokenUpdateOptionsType = MongooseUpdateQueryOptions<IToken> & { paranoid?: boolean };

// Post Model
export type PostUpdateType = UpdateQuery<IPost> | UpdateWithAggregationPipeline;
export type PostDoc = HydratedDocument<IPost>;
export type PostDocLean = Require_id<FlattenMaps<BufferToBinary<IPost>>>;
export type PostType = PostDoc | PostDocLean;
export type PostFilterType = RootFilterQuery<IPost>;
export type PostSelectionType = ProjectionType<IPost>;
export type PostOptionsType = QueryOptions<IPost> & { paranoid?: boolean };
export type PostUpdateOptionsType = MongooseUpdateQueryOptions<IPost> & { paranoid?: boolean };
export type PostDeletionOptionsType = MongooseBaseQueryOptions<IPost> & { paranoid?: boolean };
export type PostCursorType = Cursor<Unpacked<PostDoc | PostDocLean>, QueryOptions<IPost>>;

// Comment Model
export type CommentUpdateType = UpdateQuery<IComment> | UpdateWithAggregationPipeline;
export type CommentDoc = HydratedDocument<IComment>;
export type CommentDocLean = Require_id<FlattenMaps<BufferToBinary<IComment>>>;
export type CommentType = CommentDoc | CommentDocLean;
export type CommentFilterType = RootFilterQuery<IComment>;
export type CommentSelectionType = ProjectionType<IComment>;
export type CommentOptionsType = QueryOptions<IComment> & { paranoid?: boolean };
export type CommentUpdateOptionsType = MongooseUpdateQueryOptions<IComment> & { paranoid?: boolean };
export type CommentDeletionOptionsType = MongooseBaseQueryOptions<IComment> & { paranoid?: boolean };

// FriendRequest Model
export type FriendRequestUpdateType = UpdateQuery<IFriendRequest> | UpdateWithAggregationPipeline;
export type FriendRequestDoc = HydratedDocument<IFriendRequest>;
export type FriendRequestDocLean = Require_id<FlattenMaps<BufferToBinary<IFriendRequest>>>;
export type FriendRequestType = FriendRequestDoc | FriendRequestDocLean;
export type FriendRequestFilterType = RootFilterQuery<IFriendRequest>;
export type FriendRequestSelectionType = ProjectionType<IFriendRequest>;
export type FriendRequestOptionsType = QueryOptions<IFriendRequest> & { paranoid?: boolean };
export type FriendRequestUpdateOptionsType = MongooseUpdateQueryOptions<IFriendRequest> & { paranoid?: boolean };
export type FriendRequestDeletionOptionsType = MongooseBaseQueryOptions<IFriendRequest> & { paranoid?: boolean };

// Chat Model
export type ChatUpdateType = UpdateQuery<IChat> | UpdateWithAggregationPipeline;
export type ChatDoc = HydratedDocument<IChat>;
export type ChatDocLean = Require_id<FlattenMaps<BufferToBinary<IChat>>>;
export type ChatType = ChatDoc | ChatDocLean;
export type ChatFilterType = RootFilterQuery<IChat>;
export type ChatSelectionType = ProjectionType<IChat>;
export type ChatOptionsType = QueryOptions<IChat> & { paranoid?: boolean };
export type ChatUpdateOptionsType = MongooseUpdateQueryOptions<IChat> & { paranoid?: boolean };
export type ChatDeletionOptionsType = MongooseBaseQueryOptions<IChat> & { paranoid?: boolean };