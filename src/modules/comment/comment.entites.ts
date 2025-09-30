import type { CommentDoc, CommentDocLean, PaginatedDocType } from "../../utils/types/mongoose.types";
import type { IComment } from "../../DB/models/comment.model";

export interface ICommentResponse {
    comment: CommentDoc | CommentDocLean;
};

export interface ICommentWithRepliesResponse extends ICommentResponse {
    replies: PaginatedDocType<IComment>;
};

export interface ICommentUpdate {
    content?: string;
    tags?: string[];
    removedAttachments?: string[];
    removedTags?: string[];
};