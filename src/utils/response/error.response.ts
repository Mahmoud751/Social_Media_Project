import type { NextFunction, Request, Response } from "express";

interface IError extends Error {
    statusCode: number
};

export class ApplicationException extends Error {
    public statusCode: number;
    public override cause?: unknown;
    constructor(message: string, statusCode: number = 500, cause?: unknown) {
        super(message);
        this.cause = cause;
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    };
};

// Client Exceptions
export class BadRequestException extends ApplicationException {
    constructor(message: string, cause?: unknown) {
        super(message, 400, cause);
    };
};

export class UnauthorizedException extends ApplicationException {
    constructor(message: string, cause?: unknown) {
        super(message, 401, cause);
    };
};

export class ForbiddenException extends ApplicationException {
    constructor(message: string, cause?: unknown) {
        super(message, 403, cause);
    };
};

export class NotFoundException extends ApplicationException {
    constructor(message: string, cause?: unknown) {
        super(message, 404, cause);
    };
};

export class ConflictException extends ApplicationException {
    constructor(message: string, cause?: unknown) {
        super(message, 409, cause);
    };
};

// Server Exceptions

export const globalErrorHandling = (
    error: IError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    return res.status(error.statusCode || 500).json({
        name: error.name,
        message: error.message || "Internal Server Error",
        cause: error.cause,
        stack: (process.env.MOOD === "development" ? error.stack : undefined)
    });
};