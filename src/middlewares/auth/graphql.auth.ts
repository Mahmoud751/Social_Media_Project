import type { TokenRepository } from "../../DB/repository/token.repository";
import type { UserRepository } from "../../DB/repository/user.repository";
import type { UserDoc, UserDocLean } from "../../utils/types/mongoose.types";
import { type DecodedTokenType, decodedToken, TokenEnum } from "../../utils/security/token.security";
import { GraphQLError } from "graphql";
import { Role } from "../../DB/models/user.model";

export interface IAuthGraph {
    user: UserDoc | UserDocLean | null,
    error: GraphQLError | null
};

export class AuthGraphQL {
    private userModel: UserRepository;
    private tokenModel: TokenRepository;

    constructor (userModel: UserRepository, tokenModel: TokenRepository) {
        this.userModel = userModel;
        this.tokenModel = tokenModel;
    };

    authenticationGQL = (tokenType = TokenEnum.access) => {
        return async (req: any) => {
            let data: IAuthGraph = { user: null, error: null };
            try {
                if (req.headers.authorization) {
                    const decoded: DecodedTokenType = await decodedToken(req.headers.authorization, tokenType);

                    // Check If Token Is Revoked
                    if (await this.tokenModel.isExpiredToken(decoded)) {
                        throw new GraphQLError("Invalid Login Crendentials!", { extensions: { statusCode: 401 } });
                    }

                    // Check If User Exists
                    data.user = await this.userModel.findUser({
                        filter: { _id: decoded._id }
                    });
                    if (!data.user) {
                        throw new GraphQLError("User Does Not Exists!", { extensions: { statusCode: 404 } });
                    }

                    // Check If Token Not Valid Anymore
                    if (data.user.changeCredentialsTime && (data.user.changeCredentialsTime.getTime() > (decoded.iat as number) * 1000)) {
                        throw new GraphQLError("Invalid Login Crendentials!", { extensions: { statusCode: 401 } });
                    }
                }
            } catch (error: any) {
                if (error.name === "TokenExpiredError") {
                    data.error = new GraphQLError("Token Is Expired!", {
                        extensions: {
                            statusCode: 401
                        }
                    });
                } else if (error.name === "JsonWebTokenError") {
                    data.error = new GraphQLError("Invalid Signature", {
                        extensions: {
                            statusCode: 401
                        }
                    });
                } else {
                    data.error = error;
                }
            }
            return data;
        };
    };
};

export const authorizationGQL = (userRole: Role, access_roles: Role[] = [Role.super_admin, Role.admin]) => {
    if (!access_roles.includes(userRole)) {
        throw new GraphQLError("Un-Authorized Access!", { extensions: { statusCode: 403 } });
    }
};