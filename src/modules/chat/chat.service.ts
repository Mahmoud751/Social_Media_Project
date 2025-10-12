import type { ICreateGroup, IMainChat, IRoom, ISendGroupMessage, ISendMessage } from "./chat.dto";
import type { ChatDoc, ChatDocLean, IDType, UserDoc, UserDocLean } from "../../utils/types/mongoose.types";
import type { Response } from "express";
import type { IAuthRequest } from "../../utils/types/Express.types";
import type { ChatRepository } from "../../DB/repository/chat.repository";
import type { UserRepository } from "../../DB/repository/user.repository";
import type { IGetChatResponse } from "./chat.entities";
import { asyncChatHandler, successResponse } from "../../utils/response/sucess.response";
import { ApplicationException, BadRequestException, NotFoundException } from "../../utils/response/error.response";
import { connectedSockets } from "../gateway/gateway";
import { deleteFile, uploadFile } from "../../utils/multer/AWS/s3.service";

export class ChatService {
    private chatModel: ChatRepository;
    private userModel: UserRepository;

    constructor(userModel: UserRepository, chatModel: ChatRepository) {
        this.userModel = userModel;
        this.chatModel = chatModel;
    };

    // REST
    getChat = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { userId }: { userId?: string } = req.params;
        const { page, size }: { page?: string, size?: string } = req.query;

        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        const chatKey: string = this.chatModel.getChatKey(req.user._id.toString(), userId as string);
        const chat: ChatDoc | ChatDocLean | null = await this.chatModel.findChatPaginated({
            filter: {
                chatKey,
                group: { $exists: false }
            },
            options: {
                populate: [{
                    path: "participants",
                    select: "firstName lastName email gender profilePicture"
                }]
            },
            page: Number(page),
            size: Number(size)
        });

        if (!chat) {
            throw new NotFoundException("Chat Does Not Exist!");
        }
        return successResponse<IGetChatResponse>(res, { data: { chat } });
    };

    getGroupChat = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { groupId }: { groupId?: string } = req.params;
        const { page, size }: { page?:string, size?: string } = req.query;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        const chat: ChatDoc | ChatDocLean | null = await this.chatModel.findChatPaginated({
            filter: {
                _id: this.chatModel.createId(groupId as string),
                group: { $exists: true },
                participants: { $in: req.user._id }
            },
            options: {
                populate: [{
                    path: "messages.createdBy",
                    select: "firstName lastName email gender profilePicture"
                }]
            },
            page: Number(page),
            size: Number(size)
        });

        if (!chat) {
            throw new NotFoundException("Group Chat Does Not Exist!");
        }
        return successResponse<IGetChatResponse>(res, { data: { chat } });
    };

    createGroupChat = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { group }: ICreateGroup = req.body;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // Convert String IDs Into Valid IDs
        const participants: IDType[] = req.body.participants.map(
            (participant: string) => this.chatModel.createId(participant)
        );

        // Find All Users in Participants
        const users: UserDoc[] | UserDocLean[] = await this.userModel.findUsers({
            filter: {
                _id: { $in: participants },
                friends: { $in: req.user._id }
            },
        });
        if (users.length !== participants.length) {
            throw new BadRequestException("Not All Participants Are Exist!");
        }

        // Create Unique Room ID
        const roomId: string = group.replaceAll(/\s+/g, "_") + `_${Math.floor(Math.random() * 10e8)}`;

        // Upload Group_Image
        let group_image: string | undefined = undefined;
        if (req.file) {
            group_image = await uploadFile({
                path: `chat/groups/${roomId}`,
                file: req.file
            });
        }

        // Add The Creator To The Members Of The Group
        participants.push(req.user._id);

        // Create Group
        const groupChat: ChatDoc | undefined = await this.chatModel.createChat({
            participants,
            roomId,
            group: req.body.group,
            group_image: group_image as string,
            createdBy: req.user._id,
        });

        // If Creating Group Chat Failed => Remove Group_Image
        if (!groupChat) {
            if (group_image) {
                await deleteFile(group_image);
            }
            throw new ApplicationException("Failed To Create The Chat Group!");
        }
        return successResponse<IGetChatResponse>(res, {
            message: "Group Chat Created Successfully!",
            statusCode: 201,
            data: { chat: groupChat }
        });
    };

    // IO
    sayHi = asyncChatHandler(
        async ({ socket, io, callback, data }: IMainChat): Promise<void> => {
            console.log(data);
            if (callback) {
                callback("Hello From Back-End");
            }
        }
    );

    sendMessage = asyncChatHandler<ISendMessage>(
        async ({ socket, io, data }: IMainChat<ISendMessage>): Promise<void> => {
            if (!socket.user) {
                throw new NotFoundException("User Does Not Exist!");
            }

            // Check If The Receiver Exists!
            const receiverId: IDType = this.userModel.createId(data.sendTo);
            const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
                filter: {
                    _id: receiverId,
                    friends: { $in: socket.user._id }
                }
            });
            if (!user) {
                throw new NotFoundException("Recipient User Does Not Exist!");
            }

            const chatKey: string = this.chatModel.getChatKey(socket.user._id.toString(), data.sendTo);
            // Append Message To Chat If Exists
            const chat: ChatDoc | ChatDocLean | null = await this.chatModel.findChatAndUpdate({
                filter: {
                    chatKey,
                    group: { $exists: false }
                },
                updates: {
                    $addToSet: {
                        messages: { content: data.content, createdBy: socket.user._id }
                    }
                }
            });

            // If Chat Not Found => Create New One
            if (!chat) {
                const newChat: ChatDoc | undefined = await this.chatModel.createChat({
                    participants: [
                        socket.user._id,
                        receiverId
                    ],
                    messages: [{ content: data.content, createdBy: socket.user._id }],
                    createdBy: socket.user._id
                });
                if (!newChat) {
                    throw new ApplicationException("Failed To Create The Chat!");
                }
            }

            // Show Message For Sender
            io.to(
                connectedSockets.get(socket.user._id.toString()) as string[]
            ).emit("successMessage", data);

            // Notify Receiver
            io.to(
                connectedSockets.get(data.sendTo) as string[]
            ).emit("newMessage", { content: data.content, from: socket.user });
        }
    );

    sendGroupMessage = asyncChatHandler<ISendGroupMessage>(
        async ({ socket, io, data }: IMainChat<ISendGroupMessage>): Promise<void> => {
            const { content, groupId } = data;
            if (!socket.user) {
                throw new NotFoundException("User Does Not Exist!");
            }

            const chat: ChatDoc | ChatDocLean | null = await this.chatModel.findChatAndUpdate({
                filter: {
                    _id: this.chatModel.createId(groupId),
                    group: { $exists: true },
                    participants: { $in: socket.user._id }
                },
                updates: {
                    $addToSet: {
                        messages: { content, createdBy: socket.user._id }
                    }
                }
            });
            if (!chat) {
                throw new NotFoundException("Group Chat Does Not Exist!");
            }

            // Show New Sent Message
            io.to(
                connectedSockets.get(socket.user._id.toString()) as string[]
            ).emit("successMessage", { content });

            // Notify Users In Group about New Message
            io.to(chat.roomId as string).emit("newMessage", {
                content,
                from: socket.user,
                groupId
            });
        }
    );

    joinRoom = asyncChatHandler<IRoom>(
        async ({ socket, io, data }: IMainChat<IRoom>): Promise<void> => {
            const { roomId } = data;
            if (!socket.user) {
                throw new NotFoundException("User Does Not Exist!");
            }

            const chat: ChatDoc | ChatDocLean | null = await this.chatModel.findChat({
                filter: {
                    roomId,
                    group: { $exists: true },
                    participants: { $in: socket.user._id }
                }
            });
            if (!chat) {
                throw new NotFoundException("Group Chat Does Not Exist!");
            }
            console.log({ Join: roomId });
            socket.join(roomId);
        }
    );

    leaveRoom = asyncChatHandler<IRoom>(
        async ({ socket, io, data }: IMainChat<IRoom>): Promise<void> => {
            const { roomId } = data;
            if (!socket.user) {
                throw new NotFoundException("User Does Not Exist!");
            }

            const chat: ChatDoc | ChatDocLean | null = await this.chatModel.findChatAndUpdate({
                filter: {
                    roomId,
                    group: { $exists: true },
                    participants: { $in: socket.user._id }
                },
                updates: {
                    $pull: { participants: socket.user._id }
                }
            });
            if (!chat) {
                throw new NotFoundException("Group Chat Does Not Exist!");
            }

            console.log({ Leave: roomId });
            socket.leave(roomId);
        }
    );
};

