import type { Server } from "socket.io";
import type { IAuthSocket } from "../gateway/gateway";

export interface IMainChat<T = string> {
    socket: IAuthSocket;
    io: Server;
    callback?: any;
    data: T;
};

export interface ISendMessage {
    content: string;
    sendTo: string;
};

export interface ISendGroupMessage {
    content: string;
    groupId: string;
};

export interface ICreateGroup {
    participants: string[],
    group: string
};

export interface IRoom {
    roomId: string;
};