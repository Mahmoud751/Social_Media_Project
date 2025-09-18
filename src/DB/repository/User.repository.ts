import type {
    CreateOptions,
    DeleteResult,
    Model,
    UpdateQuery,
    UpdateResult,
} from "mongoose";

import type {
    UserDoc,
    UserDocLean,
    UserFilterType,
    UserUpdateType,
    UserOptionsType,
    UserSelectionType,
    UserUpdateOptionsType,
    UserDeletionOptionsType,
    IDType,
} from "../../utils/types/mongoose.types";
import type { IUser } from "../models/User.model";
import { DatabaseRepository } from "./db.repository";
import { ApplicationException } from "../../utils/response/error.response";

export class UserRepository extends DatabaseRepository<IUser> {
    constructor(model: Model<IUser>) {
        super(model);
    };
    createUser = async (
        data: Partial<IUser>,
        options?: CreateOptions
    ): Promise<UserDoc> => {
        if (!Object.keys(data).length) {
            throw new ApplicationException("Data Is Required!");
        }
        return (await this.create([data], options))[0] as UserDoc;
    };

    findUser = async ({
        filter,
        select,
        options
    }: {
        filter: Partial<IUser> & { _id?: IDType },
        select?: UserSelectionType | null | undefined,
        options?: UserOptionsType
    }): Promise<UserDoc | UserDocLean | null> => {
        if (!Object.keys(filter).length) {
            throw new ApplicationException("Filter Is Required!");
        }
        return (await this.findOne({ filter, select, options }));
    };

    updateUser = async ({
        filter,
        updates,
        options
    }: {
        filter: UserFilterType,
        updates: Partial<UserUpdateType>,
        options?: UserUpdateOptionsType
    }): Promise<UpdateResult> => {
        if (!updates.set && !updates.unset) {
            throw new ApplicationException("Updates Is Required!");
        }
        const data: UpdateQuery<IUser> = {
            ...(updates.set && { $set: updates.set }),
            ...(updates.unset && { $unset: updates.unset })
        };
        return await this.updateOne({ filter, updates: data, options });
    };

    deleteUser = async ({
        filter,
        options,
    }: {
        filter: UserFilterType,
        options?: UserDeletionOptionsType
    }): Promise<DeleteResult> => {
        return await this.deleteOne({ filter, options });
    };

    findUserAndUpdate = async({
        filter,
        updates,
        options
    }: {
        filter: UserFilterType,
        updates: UserUpdateType,
        options?: UserUpdateOptionsType
    }): Promise<UserDoc | UserDocLean | null> => {
        const data: UpdateQuery<IUser> = {
            ...(updates.set && { $set: updates.set }),
            ...(updates.unset && { $unset: updates.unset })
        };
        return await this.findOneAndUpdate({ filter, updates: data, options });
    };
};