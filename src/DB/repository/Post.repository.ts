import {
    type Model
} from "mongoose";
import type {
    CreateOptionsType,
    DeleteResultType,
    PostCursorType,
    PostDeletionOptionsType,
    PostDoc,
    PostDocLean,
    PostFilterType,
    PostOptionsType,
    PostSelectionType,
    PostUpdateOptionsType,
    PostUpdateType,
    UpdateResultType,
    UserDoc,
    UserDocLean
} from "../../utils/types/mongoose.types";
import type { CommentRepository } from "./comment.repository";
import { Availability, type IPost } from "../models/post.model";
import { DatabaseRepository } from "./db.repository";

export class PostRepository extends DatabaseRepository<IPost> {
    private commentModel: CommentRepository;
    constructor(model: Model<IPost>, commentModel: CommentRepository) {
        super(model);
        this.commentModel = commentModel;
    };

    createPost = async (
        data: Partial<IPost>,
        options?: CreateOptionsType,
    ): Promise<PostDoc | undefined> => {
        return (await this.create([data], options))[0];
    };

    findPosts = async ({
        filter,
        select,
        options
    }: {
        filter?: PostFilterType,
        select?: PostSelectionType,
        options?: PostOptionsType
    }): Promise<PostDoc[] | PostDocLean[]> => {
        return await this.find(filter, select, options);
    };

    findPostsWithComments = async ({
        filter,
        select,
        options = {},
        page = 1,
        size = 5,
        all = "false",
    }: {
        filter: PostFilterType,
        select?: PostSelectionType,
        options?: PostOptionsType,
        page?: number,
        size?: number,
        all?: string,
    }): Promise<any> => {
        // Pagination
        let docsCount: number | undefined = undefined;
        let pages: number | undefined = undefined;
        if (all === "false") {
            page = Math.floor(page < 1 ? 1 : page);
            options.limit = Math.floor(size < 1 ? 1 : size);
            options.skip = (page - 1) * size;
            docsCount = await this.model.countDocuments(filter);
            pages = Math.ceil(docsCount / options.limit);
        }

        // Using Mongoose Stream To Get Posts With First Comments
        const cursor: PostCursorType = this.model.find(filter, select, options).cursor();
        let documents: any[] = [];
        for (let doc: PostDoc | PostDocLean | null = await cursor.next(); doc != null; doc = await cursor.next()) {
            const comments: any = await this.commentModel.findComments({
                filter: { postId: doc._id, commentId: { $exists: false } }
            });
            documents.push({ doc, comments });
        }
        return {
            docsCount: docsCount || documents.length,
            pages: pages || 1,
            limit: options.limit || documents.length,
            documents
        };
    };

    findPost = async ({
        filter,
        select,
        options
    }: {
        filter: PostFilterType,
        select?: PostSelectionType,
        options?: PostOptionsType
    }): Promise<PostDoc | PostDocLean | null> => {
        return await this.findOne(filter, select, options);
    };

    updatePost = async ({
        filter,
        updates,
        options
    }: {
        filter: PostFilterType,
        updates: PostUpdateType,
        options?: PostUpdateOptionsType
    }): Promise<UpdateResultType> => {
        return await this.updateOne(filter, updates, options);
    };

    deletePost = async ({
        filter,
        options
    }: {
        filter: PostFilterType,
        options?: PostDeletionOptionsType
    }): Promise<DeleteResultType> => {
        // const session = await startSession();
        // session.startTransaction();
        // try {
        //     const Comment = models.Comment as Model<IComment>;
        //     const post: PostDoc | PostDocLean | null = await this.model.findOneAndDelete(
        //         filter, { ...options, lean: true }
        //     ).select("_id").session(session);
        //     if (!post) {
        //         throw new NotFoundException("Post Does Not Exist!");
        //     }

        //     // Delete Post's Comments If Exist
        //     await Comment.deleteMany({ postId: post._id }),

        //     // Successful Transaction
        //     await session.commitTransaction();
        // } catch (error) {
        //     await session.abortTransaction();
        //     return { acknowledged: false, deletedCount: 0 }
        // } finally {
        //     session.endSession();
        // }
        // return { acknowledged: true, deletedCount: 1 };
        return this.deleteOne(filter, options);
    };

    findPostAndDelete = async ({
        filter,
        options,
    }: {
        filter: PostFilterType,
        options?: PostDeletionOptionsType
    }): Promise<PostDoc | PostDocLean | null> => {
        return this.findOneAndDelete(filter, options);
    };

    findPostAndUpdate = async ({
        filter,
        updates,
        options
    }: {
        filter: PostFilterType,
        updates: PostUpdateType,
        options?: PostUpdateOptionsType
    }): Promise<PostDoc | PostDocLean | null> => {
        return await this.findOneAndUpdate(filter, updates, options);
    };

    getPostAvailability = (user: UserDoc | UserDocLean): any => {
        return [
            { availability: Availability.public },
            { availability: Availability.onlyMe, createdBy: user._id },
            {
                availability: Availability.friends,
                createdBy: { $in: [...(user.friends || []), user._id] }
            },
            { availability: { $ne: Availability.onlyMe }, tags: user._id },
        ];
    };
};