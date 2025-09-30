import type { JwtPayload } from "jsonwebtoken"
import type { Gender } from "../../DB/models/user.model"
import type { IEmailConfirmation } from "../auth/auth.dto"
import type { IDType, UserDoc, UserDocLean } from "../../utils/types/mongoose.types"

export interface IDecoded {
    decoded?: JwtPayload
};

export interface IProfile extends IDecoded {
    user?: Partial<UserDoc> | Partial<UserDocLean>,
};

export interface ILogout {
    flag: string
};

export interface IUpdatePassword extends ILogout {
    oldPassword: string,
    newPassword: string
};

export interface IResetPassword extends IEmailConfirmation {
    password: string
};

export interface IUpdate {
    username?: string | undefined;
    firstName?: string;
    lastName?: string;
    age?: number;
    phone?: string;
    address?: string;
    gender?: Gender;
};

export interface IProfileImage {
    originalname: string
    ContentType: string;
};

export interface IUserId {
    userId?: IDType;
};
