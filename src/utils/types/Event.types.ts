import type { Types } from "mongoose";
import type { Options as MailOptions } from "nodemailer/lib/mailer";
import type { UserDocLean } from "./mongoose.types";

export interface IEmailOptions extends MailOptions {
    otp?: string;
};

export interface IEmailRequestOptions extends MailOptions {
    link?: string;
};

export interface IEmailUpdateOptions extends MailOptions {
    oldEmaiL?: string;
    newEmaiL?: string;
};

export type Events = {
    "track-profile-photo-upload": {
        userId: Types.ObjectId;
        oldKey?: string;
        key: string;
        expiresIn?: number;
    };

    "send-confirmation-email": IEmailOptions;

    "reset-password-email": IEmailOptions;

    "login-with-otp": IEmailOptions;

    "enable-2SV": IEmailOptions;

    "update-email": IEmailRequestOptions;

    "notify-email-update": IEmailUpdateOptions

    "send-tag-notification-emails": Partial<UserDocLean>[];
}