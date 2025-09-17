import type { Options as MailOptions } from 'nodemailer/lib/mailer';
import { type Transporter, createTransport } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export const sendEmail = async (email: MailOptions): Promise<void> => {
    const transporter: Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options> = createTransport({
        service: 'gmail',
        auth: {
            user: process.env.APP_EMAIL,
            pass: process.env.APP_PASSWORD
        }
    });
    await transporter.sendMail({
        ...email,
        from: `"App_Team" <${email.from || process.env.APP_EMAIL}>`
    });
};