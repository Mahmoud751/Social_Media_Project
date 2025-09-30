import type {
    CreateOptions,
    Model,
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
import type { IToken } from "../models/token.model";
import { DatabaseRepository } from "./db.repository";
import { ApplicationException } from "../../utils/response/error.response";
import { DecodedTokenType } from "../../utils/security/token.security";

export class TokenRepository extends DatabaseRepository<IToken> {
    constructor(model: Model<IToken>) {
        super(model);
    };

    createToken = async (
        data: Partial<IToken>,
        options?: CreateOptions
    ): Promise<TokenDoc | undefined> => {
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
        return await this.findOne(filter, select, options);
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
        return await this.updateOne(filter, updates, options);
    };

    isExpiredToken = async (decodedToken: DecodedTokenType): Promise<boolean> => {
        // Check If Token Is Revoked
        const revokedToken: TokenDoc | TokenDocLean | null = await this.model.findOne({
            jti: decodedToken.jti
        });
        return decodedToken && decodedToken.jti && revokedToken? true : false;
    };
};