import type { IEmailOptions, IEmailRequestOptions, IEmailUpdateOptions } from "../types/Event.types";
import type { UserDocLean } from "../types/mongoose.types";
import { sendEmail } from "../security/email/send.email";
import { verifyEmailTemplate } from "../security/email/templates/verifyEmail.template";
import { AppEmitter } from "../../shared/events.shared";

const emailEvent = new AppEmitter();

emailEvent.on("send-confirmation-email", async (data: IEmailOptions): Promise<void> => {
    try {
        const subject: string = data.subject || 'Email Confirmation';
        await sendEmail({
            ...data,
            subject,
            html: verifyEmailTemplate(data.otp as string, subject)
        });
    } catch (error: unknown) {
        console.log("Failed To Send The Email!", error);
    }
});

emailEvent.on("reset-password-email", async (data: IEmailOptions): Promise<void> => {
    try {
        const subject: string = data.subject || 'Reset Password';
        await sendEmail({
            ...data,
            subject,
            html: verifyEmailTemplate(data.otp as string, subject)
        });
    } catch (error) {
        console.log("Failed To Send The Email!", error);
    }
});

emailEvent.on("send-tag-notification-emails", async ({
    authorName,
    users
}:{
    authorName: string,
    users: Partial<UserDocLean>[]
}): Promise<void> => {
    try {
        const subject: string = "Tag Notification";
        await Promise.all(users.map((user) => sendEmail({
            to: user.email,
            subject,
            html: verifyEmailTemplate(`${authorName} Tagged You On His New Post!`, subject)
        })));
    } catch (error) {
        console.log("Failed To Send The Emails", error);
    }
});

emailEvent.on("login-with-otp", async (data: IEmailOptions): Promise<void> => {
    try {
        const subject: string = data.subject ||  "Login Confirmation";
        await sendEmail({
            ...data,
            subject,
            html: verifyEmailTemplate(data.otp as string, subject)
        });
    } catch (error) {
        console.log("Failed To Send The Email!", error);
    }
});

emailEvent.on("enable-2SV", async (data: IEmailOptions): Promise<void> => {
    try {
        const subject: string = data.subject ||  "Two Step Verification Activation";
        await sendEmail({
            ...data,
            subject,
            html: verifyEmailTemplate(data.otp as string, subject)
        });
    } catch (error) {
        console.log("Failed To Send The Email!", error);
    }
});

emailEvent.on("update-email", async (data: IEmailRequestOptions) => {
    try {
        const subject: string = data.subject || "New Email Confirmation";
        await sendEmail({
            ...data,
            subject,
            html: verifyEmailTemplate(
                `<p>Click <a href="${data.link}" target="_blank">Here</a> To Update Your App Email</p>`,
                subject
            )
        });
    } catch (error) {
        console.log("Failed To Send The Email!", error);
    }
});

emailEvent.on("notify-email-update", async (data: IEmailUpdateOptions) => {
    try {
        const subject: string = data.subject || "Email Update";
        await Promise.all([
            sendEmail({
                ...data,
                to: data.oldEmaiL,
                subject,
                html: verifyEmailTemplate(`Your Email On ${process.env.APP_NAME} Has Been Changed!`, subject)
            }),
            sendEmail({
                ...data,
                to: data.newEmaiL,
                subject,
                html: verifyEmailTemplate(`This Email On ${process.env.APP_NAME} Has Been Set As The New Email!`, subject)
            })
        ]);
    } catch (error) {
        console.log("Failed To Send The Email!", error);
    }
});

export default emailEvent;