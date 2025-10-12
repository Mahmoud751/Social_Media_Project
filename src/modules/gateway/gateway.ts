import type { Server as HttpServer } from 'http';
import type { UserDoc, UserDocLean } from '../../utils/types/mongoose.types';
import { Socket, Server as SocketServer } from 'socket.io';
import { authSocket } from './authentication.gateway';
import { DecodedTokenType } from '../../utils/security/token.security';
import { ChatGateway } from '../chat';
import { ChatEvent } from '../chat/chat.events';
import { ChatService } from '../chat/chat.service';
import { chatRepo, userRepo } from '../../shared/repos.shared';

export interface IAuthSocket extends Socket {
    user?: UserDoc | UserDocLean,
    decoded?: DecodedTokenType
};

export const connectedSockets = new Map<string, string[]>();

export const initializeIo = (httpServer: HttpServer): void => {
    // Socket.io Connection
    const io = new SocketServer(httpServer, {
        cors: {
            origin: ["http://127.0.0.1:5500"]
        }
    });

    // Authentication
    io.use(authSocket());

    const chatService = new ChatService(userRepo, chatRepo);
    const chatEvent = new ChatEvent(chatService);
    const chatGateway = new ChatGateway(chatEvent);
    io.on("connection", (socket: IAuthSocket) => {
        console.log("Socket Connected Successfully🚀🚀");
        console.log(`User ::: ${socket.id}`);

        // Register Socket Events
        chatGateway.register(socket, io);

        // When Socket Is Disconnected
        socket.on("disconnect", () => {
            console.log(`Socket User ::: ${socket.id} Has Been Disconnected!`);
            const userSockets: string[] = connectedSockets.get((socket.user as UserDoc | UserDocLean)._id.toString()) || [];

            console.log(socket.id);
            console.log(userSockets);
            if (userSockets && userSockets.length) {
                userSockets.splice(userSockets.indexOf(socket.id), 1);
            }

            if (!userSockets.length) {
                io.emit("offline_user", `${socket.user?.firstName} ${socket.user?.lastName} Is Offline`);
            }
            console.log(userSockets);
        });
    });
};