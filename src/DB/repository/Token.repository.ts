import type {
    CreateOptions,
    Model,
    UpdateQuery
} from "mongoose";
import type {
    TokenDoc,
    TokenDocLean,
    TokenFilterType,
    TokenOptionsType,
    TokenSelectionType,
    TokenUpdateOptionsType,
    TokenUpdateType
} from "../../utils/types/mongoose.types";
import type { IToken } from "../models/Token.model";
import { DatabaseRepository } from "./db.repository";
import { ApplicationException } from "../../utils/response/error.response";

export class TokenRepository extends DatabaseRepository<IToken> {
    constructor (model: Model<IToken>) {
        super(model);
    };

    createToken = async ({
        data,
        options
    }: {
        data: Partial<IToken>,
        options?: CreateOptions
    }): Promise<any> => {
        if (!Object.keys(data).length) {
            throw new ApplicationException("Data Is Required!");
        }
        return (await this.create([data], options))[0];
    };

    findToken = async ({
        filter,
        select,
        options
    }: {
        filter: TokenFilterType,
        select?: TokenSelectionType,
        options?: TokenOptionsType
    }): Promise<TokenDoc | TokenDocLean | null> => {
        if (!Object.keys(filter).length) {
            throw new ApplicationException("Filter Is Required!");
        }
        return await this.findOne({ filter, select, options });
    };

    updateToken = async ({
        filter,
        updates,
        options
    }: {
        filter: TokenFilterType,
        updates: TokenUpdateType,
        options: TokenUpdateOptionsType
    }): Promise<any> => {
        if (!updates.set && !updates.unset) {
            throw new ApplicationException("Updates Is Required!");
        }
        const data: UpdateQuery<IToken> = {
            ...(updates.set && { $set: updates.set }),
            ...(updates.unset && { $unset: updates.unset }),
        };
        return await this.updateOne({ filter, updates: data, options });
    };
};