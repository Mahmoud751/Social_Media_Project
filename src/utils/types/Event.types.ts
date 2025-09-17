import type { Types } from "mongoose";
import type { Options as MailOptions } from "nodemailer/lib/mailer";

export interface IEmailOptions extends MailOptions {
    otp?: string;
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
};