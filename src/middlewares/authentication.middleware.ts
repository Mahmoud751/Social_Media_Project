import type { NextFunction, Response } from "express";
import type { UserRepository } from "../DB/repository/User.repository";
import type { AuthRequestHandler, IAuthRequest } from "../utils/types/Express.types";
import type { TokenDoc, TokenDocLean } from "../DB/models/Token.model";
import { type UserDoc, type UserDocLean, Role } from "../DB/models/User.model";
import { type DecodedTokenType, decodedToken, TokenEnum } from "../utils/security/token.security";
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from "../utils/response/error.response";
import { TokenRepository } from "../DB/repository/Token.repository";
import { tokenRepo } from "../shared/repos.shared";

export class AuthMiddleware {
    private userModel: UserRepository;
    private tokenModel: TokenRepository = tokenRepo;

    constructor(userModel: UserRepository) {
        this.userModel = userModel;
    };

    authentication = (tokenType: TokenEnum = TokenEnum.access): AuthRequestHandler => {
        return async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
            if (!req.headers.authorization) {
                throw new BadRequestException("No Token Provided!");
            }
            const decoded: DecodedTokenType = await decodedToken(req.headers.authorization, tokenType);

            // Check If Token Is Revoked
            const revokedToken: TokenDoc | TokenDocLean | null = await this.tokenModel.findToken({
                filter: { jti: decoded.jti },
                options: { lean: true }
            });
            if (decoded.jti && revokedToken) {
                throw new UnauthorizedException("Invalid Login Crendentials!");
            }

            // Check If User Exists
            const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
                filter: { _id: decoded._id },
                options: { lean: true }
            });
            if (!user) {
                throw new NotFoundException("User Does Not Exists!");
            }

            // Check If Token Not Valid Anymore
            if (user.changeCredentialsTime && (user.changeCredentialsTime.getTime() > (decoded?.iat as number) * 1000)) {
                throw new UnauthorizedException("Invalid Login Crendentials!");
            }
            req.user = user;
            req.decoded = decoded;
            next();
        };
    };

    authorization = (access_roles: Role[] = [Role.user]): AuthRequestHandler => {
        return async (req: IAuthRequest, response: Response, next: NextFunction): Promise<void> => {
            if (!access_roles.includes(req.user?.role as Role)) {
                throw new ForbiddenException("Un-Authorized Access!");
            }
            next();
        };
    };

    auth = (tokenType: TokenEnum = TokenEnum.access, access_roles: Role[] = [Role.user]): AuthRequestHandler => {
        return async (req: IAuthRequest, res: Response, next: NextFunction) => {
            const decoded: DecodedTokenType = await decodedToken(req.headers.authorization as string);
            const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
                filter: { _id: decoded._id },
                options: { lean: true }
            });
            if (!user) {
                throw new NotFoundException("User Does Not Exists!");
            }
            if (!access_roles.includes(user.role)) {
                throw new ForbiddenException("Un-Authorized Access!");
            }
            req.decoded = decoded;
            req.user = user;
            next();
        };
    };
};

// export const 