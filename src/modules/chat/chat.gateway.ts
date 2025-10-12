import type { Server } from "socket.io";
import type { IAuthSocket } from "../gateway/gateway";
import type { ChatEvent } from "./chat.events";

export class ChatGateway {
    private chatEvent: ChatEvent;

    constructor(chatEvent: ChatEvent) {
        this.chatEvent = chatEvent;
    };

    register = (socket: IAuthSocket, io: Server): void => {
        this.chatEvent.sayHi(socket, io);
        this.chatEvent.sendMessage(socket, io);
        this.chatEvent.sendGroupMessage(socket, io);
        this.chatEvent.joinRoom(socket, io);
        this.chatEvent.leaveRoom(socket, io);
    };
};