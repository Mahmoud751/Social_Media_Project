import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";
import type { UserDoc, UserDocLean } from "../../DB/models/User.model";

export interface IAuthRequest extends Request {
    user?: UserDoc | UserDocLean,
    decoded?: JwtPayload
};

export type AuthRequestHandler = (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
) => Promise<void>;

// declare module "express-serve-static-core" {
    //     interface Request {
//         user?: UserDoc | UserDocLean,
//         decoded?: JwtPayload
//     }
// };


// No need to Edit In tsconfig
// declare global {
//     namespace Express {
//         interface Request {
//             user?: UserDoc | UserDocLean;
//             decoded?: JwtPayload;
//         }
//     }
// };
