import { Model } from "mongoose";
import { IChat } from "../models/chat.model";
import { DatabaseRepository } from "./db.repository";
import { ChatDeletionOptionsType, ChatDoc, ChatDocLean, ChatFilterType, ChatOptionsType, ChatSelectionType, ChatUpdateOptionsType, ChatUpdateType, CreateOptionsType, DeleteResultType, UpdateResultType } from "../../utils/types/mongoose.types";

export class ChatRepository extends DatabaseRepository<IChat> {
    constructor(model: Model<IChat>) {
        super(model);
    };

    createChat = async (
        data: Partial<IChat>,
        options?: CreateOptionsType
    ): Promise<ChatDoc | undefined> => {
        return (await this.create([data], options))[0];
    };

    getChatKey = (userId1: string, userId2: string): string => {
        if (userId1 === userId2) {
            return userId1;
        }
        return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
    };

    findChats = async ({
        filter,
        select,
        options
    }: {
        filter: ChatFilterType,
        select?: ChatSelectionType,
        options?: ChatOptionsType
    }): Promise<ChatDoc[] | ChatDocLean[]> => {
        return await this.find(filter, select, options);
    };

    findChatPaginated = async ({
        filter,
        select,
        options,
        page = 1,
        size = 5
    }: {
        filter: ChatFilterType,
        select?: ChatSelectionType,
        options?: ChatOptionsType,
        page?: number,
        size?: number
    }): Promise<ChatDoc | ChatDocLean | null> => {
        page = Math.floor(!page || page < 1 ? 1 : page);
        size = Math.floor(!size || size < 1 ? 5 : size);
        return await this.findOne(filter, {
            messages: { $slice: [-1 * (page * size), size] }
        }, options);
    };

    findChat = async ({
        filter,
        select,
        options
    }: {
        filter: ChatFilterType,
        select?: ChatSelectionType,
        options?: ChatOptionsType
    }): Promise<ChatDoc | ChatDocLean | null> => {
        return await this.findOne(filter, select, options);
    };

    updateChat = async ({
        filter,
        updates,
        options
    }: {
        filter: ChatFilterType,
        updates: ChatUpdateType,
        options?: ChatUpdateOptionsType
    }): Promise<UpdateResultType> => {
        return await this.updateOne(filter, updates, options);
    };

    deleteChat = async ({
        filter,
        options,
    }: {
        filter: ChatFilterType,
        options?: ChatDeletionOptionsType
    }): Promise<DeleteResultType> => {
        return await this.deleteOne(filter, options);
    };

    findChatAndDelete = async (
        filter: ChatFilterType,
        options?: ChatDeletionOptionsType,
    ): Promise<ChatDoc | ChatDocLean | null> => {
        return await this.findOneAndDelete(filter, options);
    };

    deleteChats = async (
        filter: ChatFilterType,
        options?: ChatDeletionOptionsType
    ): Promise<DeleteResultType> => {
        return await this.deleteMany(filter, options);
    };

    findChatAndUpdate = async ({
        filter,
        updates,
        options
    }: {
        filter: ChatFilterType,
        updates: ChatUpdateType,
        options?: ChatUpdateOptionsType
    }): Promise<ChatDoc | ChatDocLean | null> => {
        return await this.findOneAndUpdate(filter, updates, options);
    };
};