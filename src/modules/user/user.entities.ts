import type { ChatDoc, ChatDocLean, UserDoc, UserDocLean } from "../../utils/types/mongoose.types";

export interface IProfileResponse {
    user: Partial<UserDoc> | Partial<UserDocLean>;
    groups: Partial<ChatDoc[] | ChatDocLean[]>;
};

export interface ICrendentialsResponse {
    credentials: {
        access_token: string;
        refresh_token: string;
    };
};

export interface IProfileImageResponse {
    key: string;
    url: string;
};

export interface IProfileCoverImageResponse {
    keys: string[];
};