import type {
    CommentDeletionOptionsType,
    CommentDoc,
    CommentDocLean,
    CommentFilterType,
    CommentOptionsType,
    CommentSelectionType,
    CommentUpdateOptionsType,
    CommentUpdateType,
    CreateOptionsType,
    DeleteResultType,
    UpdateResultType
} from "../../utils/types/mongoose.types";
import type { Model } from "mongoose";
import type { IComment } from "../models/comment.model";
import { DatabaseRepository } from "./db.repository";

export class CommentRepository extends DatabaseRepository<IComment> {
    constructor(model: Model<IComment>) {
        super(model);
    };

    createComment = async (
        data: Partial<IComment>,
        options?: CreateOptionsType
    ): Promise<CommentDoc | undefined> => {
        return (await this.create([data], options))[0];
    };

    findComments = async ({
        filter,
        select,
        options
    }: {
        filter: CommentFilterType,
        select?: CommentSelectionType,
        options?: CommentOptionsType
    }): Promise<CommentDoc[] | CommentDocLean[]> => {
        return await this.find(filter, select, options);
    };

    findComment = async ({
        filter,
        select,
        options
    }: {
        filter: CommentFilterType,
        select?: CommentSelectionType,
        options?: CommentOptionsType
    }): Promise<CommentDoc | CommentDocLean | null> => {
        return await this.findOne(filter, select, options);
    };

    updateComment = async ({
        filter,
        updates,
        options
    }: {
        filter: CommentFilterType,
        updates: CommentUpdateType,
        options?: CommentUpdateOptionsType
    }): Promise<UpdateResultType> => {
        return await this.updateOne(filter, updates, options);
    };

    deleteComment = async ({
        filter,
        options,
    }: {
        filter: CommentFilterType,
        options?: CommentDeletionOptionsType
    }): Promise<DeleteResultType> => {
        // const comment: CommentDoc | CommentDocLean | null = await this.model.findOneAndDelete(filter, options);
        // if (!comment) {
        //     throw new NotFoundException("Comment Does Not Exist!");
        // }

        // // Delete Assets If Exist!
        // if (comment.attachments) {
        //     await deleteFiles(comment.attachments);
        // }
        // return { acknowledged: true, deletedCount: 1 };
        return await this.deleteOne(filter, options);
    };

    findCommentAndDelete = async (
        filter: CommentFilterType,
        options?: CommentDeletionOptionsType,
    ): Promise<CommentDoc | CommentDocLean | null> => {
        return await this.findOneAndDelete(filter, options);
    };

    deleteComments = async (
        filter: CommentFilterType,
        options?: CommentDeletionOptionsType
    ): Promise<DeleteResultType> => {
        return await this.deleteMany(filter, options);
    };

    findCommentAndUpdate = async ({
        filter,
        updates,
        options
    }: {
        filter: CommentFilterType,
        updates: CommentUpdateType,
        options?: CommentUpdateOptionsType
    }): Promise<CommentDoc | CommentDocLean | null> => {
        return await this.findOneAndUpdate(filter, updates, options);
    };
};