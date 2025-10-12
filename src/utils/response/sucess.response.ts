import type { Response } from "express";
import type { IMainChat } from "../../modules/chat/chat.dto";

interface IResponseParams<T> {
    message?: string;
    statusCode?: number;
    data?: T
};

export type SocketHandler<T> = ({ socket, io, callback, data }: IMainChat<T>) => Promise<void>;

export const asyncChatHandler = <T = string>(fn: SocketHandler<T>): SocketHandler<T> => {
    return async ({ socket, io, callback, data }: IMainChat<T>): Promise<void> => {
        try {
            await fn({ socket, io, callback, data });
        } catch (error) {
            socket.emit("custom_error", error);
        }
    };
};

export const successResponse = async <T = any>(res: Response, {
    message = "Done",
    statusCode = 200,
    data
}: IResponseParams<T>): Promise<Response> => {
    return res.status(statusCode).json({ message, data });
};