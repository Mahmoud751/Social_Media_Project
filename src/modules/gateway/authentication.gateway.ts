import { ExtendedError, Socket } from "socket.io";
import { decodedToken, DecodedTokenType, TokenEnum } from "../../utils/security/token.security";
import { UserRepository } from "../../DB/repository/user.repository";
import { TokenRepository } from "../../DB/repository/token.repository";
import { tokenRepo, userRepo } from "../../shared/repos.shared";
import { NotFoundException, UnauthorizedException } from "../../utils/response/error.response";
import { UserDoc, UserDocLean } from "../../utils/types/mongoose.types";
import { connectedSockets, IAuthSocket } from "./gateway";

export const authSocket = (
    tokenType: TokenEnum = TokenEnum.access,
    userModel: UserRepository = userRepo,
    tokenModel: TokenRepository = tokenRepo
): (
    socket: IAuthSocket,
    next: (err?: ExtendedError) => void
) => void => {
    return async (socket: IAuthSocket, next) => {
        try {
            const decoded: DecodedTokenType = await decodedToken(socket.handshake.auth.authorization);

            // Check If Token Revoked Or Expired
            if (await tokenModel.isExpiredToken(decoded)) {
                throw new UnauthorizedException("Invalid Login Crendentials!");
            }

            const user: UserDoc | UserDocLean | null = await userModel.findUser({
                filter: { _id: decoded._id },
            });

            // Check If User Exist
            if (!user) {
                throw new NotFoundException("User Does Not Exist!");
            }

            // Check If Token is Not Valid Anymore
            if (user.changeCredentialsTime && user.changeCredentialsTime.getTime() > (decoded.iat as number) * 1000) {
                throw new UnauthorizedException("Invalid Login Crendentials!");
            }

            const id: string = user._id.toString();
            const userSockets: string[] = connectedSockets.get(id) || [];
            if (userSockets && userSockets.length) {
                userSockets.push(socket.id);
            } else {
                connectedSockets.set(id, [socket.id]);
            }
            console.log(connectedSockets);
            socket.user = user;
            socket.decoded = decoded;
            next();
        } catch (error: any) {
            next(error);
        }
    };
};