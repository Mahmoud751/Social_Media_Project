import { EventEmitter } from "node:stream";
import { sendEmail } from "../security/email/send.email";
import { verifyEmailTemplate } from "../security/email/templates/verifyEmail.template";
import type { Options as MailOptions } from "nodemailer/lib/mailer";

export const emailEvent = new EventEmitter();

export interface IEmailOTP extends MailOptions {
    otp: number
};

emailEvent.on("ConfirmEmail", async (data: IEmailOTP): Promise<void> => {
    try {
        const subject: string = data.subject || 'Email Confirmation';
        await sendEmail({
            ...data,
            subject,
            html: verifyEmailTemplate(data.otp, subject)
        });
    } catch (error: unknown) {
        console.log("Failed To Send The Email!", error);
    }
});

emailEvent.on("ResetPassword", async (data: IEmailOTP): Promise<void> => {
    try {
        const subject: string = data.subject || 'Reset Password';
        await sendEmail({
            ...data,
            subject,
            html: verifyEmailTemplate(data.otp, subject)
        });
    } catch (error) {
        console.log("Failed To Send The Email!", error);
    }
});