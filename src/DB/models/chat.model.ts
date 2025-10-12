import { model, models, Schema, type Types } from "mongoose";

export interface IMessage {
    content: string;
    createdBy: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
};

export interface IChat {
    // OVO
    participants: Types.ObjectId[];
    messages: IMessage[];
    chatKey?: string;

    // OVM
    group?: string;
    group_image?: string;
    roomId?: string;

    // Common
    createdBy: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
};

const messageSchema = new Schema<IMessage>({
    content: {
        type: String,
        minLength: [1, "Min Length Is 1"],
        maxLength: [20000, "Max Length Is 20000"],
        required: [true, "Content Must Be Provided!"]
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Message Must Have A Creator!"]
    }
}, {
    timestamps: true,
    optimisticConcurrency: true
});

const chatSchema = new Schema<IChat>({
    participants: [{
        type: Schema.Types.ObjectId,
        required: [true, "Participants Is Required!"],
        ref: "User"
    }],
    group: String,
    group_image: String,
    roomId: {
        type: String,
        required: [function () { return this.group }, "Room ID Is Required!"]
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        required: [true, "Chat Must Have A Creator!"]
    },
    chatKey: {
        type: String
    },
    messages: [messageSchema]
}, {
    timestamps: true,
    optimisticConcurrency: true
});

chatSchema.index({ chatKey: 1 }, { unique: true, sparse: true });

chatSchema.pre("save", async function (next) {
    // If Normal Chat
    if (!this.group) {
        const userId1: string = (this.participants[0] as Types.ObjectId).toString();
        const userId2: string = (this.participants[1] as Types.ObjectId).toString();

        // If Self-Chat
        if (userId1 === userId2) {
            this.chatKey = userId1 as string;
        } else {
            this.chatKey = userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
        }
    }
});

export const Chat = models.Chat || model<IChat>("Chat", chatSchema);