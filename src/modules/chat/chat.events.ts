import type { ChatService } from "./chat.service";
import type { IAuthSocket } from "../gateway/gateway";
import type { Server } from "socket.io";
import type { IRoom, ISendGroupMessage, ISendMessage } from "./chat.dto";

export class ChatEvent {
    private chatService: ChatService;

    constructor(chatService: ChatService) {
        this.chatService = chatService;
    };

    sayHi = (socket: IAuthSocket, io: Server): void => {
        socket.on("sayHi", (message: string, callback: any) => {
            this.chatService.sayHi({ socket, io, data: message, callback });
        });
    };

    sendMessage = (socket: IAuthSocket, io: Server): void => {
        socket.on("sendMessage", (data: ISendMessage) => {
            this.chatService.sendMessage({ socket, io, data });
        });
    };

    sendGroupMessage = (socket: IAuthSocket, io: Server): void => {
        socket.on("sendGroupMessage", (data: ISendGroupMessage) => {
            this.chatService.sendGroupMessage({ socket, io, data });
        });
    };

    joinRoom = (socket: IAuthSocket, io: Server): void => {
        socket.on("join_room", (data: IRoom) => {
            this.chatService.joinRoom({ socket, io, data });
        });
    };

    leaveRoom = (socket: IAuthSocket, io: Server): void => {
        socket.on("leave_room", (data: IRoom) => {
            this.chatService.leaveRoom({ socket, io, data });
        });
    };
};