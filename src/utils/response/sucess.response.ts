import type { Response } from "express";

interface IResponseParams<T> {
    message?: string;
    statusCode?: number;
    data?: T
};

export const successResponse = async <T = any>(res: Response, {
    message = "Done",
    statusCode = 200,
    data
}: IResponseParams<T>): Promise<Response> => {
    return res.status(statusCode).json({ message, data });
};