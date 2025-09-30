import type {
    CreateOptionsType,
    DeleteResultType,
    FriendRequestDeletionOptionsType,
    FriendRequestDoc,
    FriendRequestDocLean,
    FriendRequestFilterType,
    FriendRequestOptionsType,
    FriendRequestSelectionType,
    FriendRequestUpdateOptionsType,
    FriendRequestUpdateType,
    UpdateResultType
} from "../../utils/types/mongoose.types";
import type { Model } from "mongoose";
import { IFriendRequest } from "../models/friendRequest.model";
import { DatabaseRepository } from "./db.repository";

export class FriendRequestRepository extends DatabaseRepository<IFriendRequest> {
    constructor(model: Model<IFriendRequest>) {
        super(model);
    };

    createFriendRequest = async (
        data: Partial<IFriendRequest>,
        options?: CreateOptionsType
    ): Promise<FriendRequestDoc | undefined> => {
        return (await this.create([data], options))[0];
    };

    getCompounIndex = (userId1: string, userId2: string): string => {
        return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
    };

    FindFriendRequests = async ({
        filter,
        select,
        options
    }: {
        filter: FriendRequestFilterType,
        select?: FriendRequestSelectionType,
        options?: FriendRequestOptionsType
    }): Promise<FriendRequestDoc[] | FriendRequestDocLean[]> => {
        return await this.find(filter, select, options);
    };

    findFriendRequest = async ({
        filter,
        select,
        options
    }: {
        filter: FriendRequestFilterType,
        select?: FriendRequestSelectionType,
        options?: FriendRequestOptionsType
    }): Promise<FriendRequestDoc | FriendRequestDocLean | null> => {
        return await this.findOne(filter, select, options);
    };

    updateFriendRequest = async ({
        filter,
        updates,
        options
    }: {
        filter: FriendRequestFilterType,
        updates: FriendRequestUpdateType,
        options?: FriendRequestUpdateOptionsType
    }): Promise<UpdateResultType> => {
        return await this.updateOne(filter, updates, options);
    };

    deleteFriendRequest = async ({
        filter,
        options,
    }: {
        filter: FriendRequestFilterType,
        options?: FriendRequestDeletionOptionsType
    }): Promise<DeleteResultType> => {
        return await this.deleteOne(filter, options);
    };

    findFriendRequestAndUpdate = async ({
        filter,
        updates,
        options
    }: {
        filter: FriendRequestFilterType,
        updates: FriendRequestUpdateType,
        options?: FriendRequestUpdateOptionsType
    }): Promise<FriendRequestDoc | FriendRequestDocLean | null> => {
        return await this.findOneAndUpdate(filter, updates, options);
    };

    findFriendRequestAndDelete = async ({
        filter,
        options
    }: {
        filter: FriendRequestFilterType,
        options?: FriendRequestDeletionOptionsType
    }): Promise<FriendRequestDoc | FriendRequestDocLean | null> => {
        return await this.findOneAndDelete(filter, options)
    };
};