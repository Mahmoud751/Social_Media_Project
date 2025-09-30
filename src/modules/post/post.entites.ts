import type { IPost } from "../../DB/models/post.model";
import type { PaginatedDocType, PostDoc, PostDocLean } from "../../utils/types/mongoose.types";

export interface IPostResponse {
    post: PostDoc | PostDocLean;
};

export interface IListPostsResponse {
    posts: PaginatedDocType<IPost>;
};