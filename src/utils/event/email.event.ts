import type { IEmailOptions } from "../types/Event.types";
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

export default emailEvent;