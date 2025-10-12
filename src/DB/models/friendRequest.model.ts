import { model, models, Schema, type Types } from "mongoose";

export enum StatusEnum {
    accepted = "Accepted",
    pending = "Pending",
    declined = "Declined"
};

export interface IFriendRequest {
    sender: Types.ObjectId;
    receiver: Types.ObjectId;
    senderReceiverKey: string;
    status?: StatusEnum;
    createdAt?: Date;
    updatedAt?: Date;
};

const friendRequest = new Schema<IFriendRequest>({
    sender: {
        type: Schema.Types.ObjectId,
        required: [true, "Sender By Must Be Required"]
    },
    receiver: {
        type: Schema.Types.ObjectId,
        required: [true, "Receiver By Must Be Required"]
    },
    senderReceiverKey: {
        type: String,
        unique: [true, "Sender, Receiver Must Be Unique!"]
    },
    status: {
        type: String,
        enum: {
            values: Object.values(StatusEnum),
            message: `Only ${Object.values(StatusEnum)} Are Allowed!`
        },
        default: StatusEnum.pending
    }
}, {
    timestamps: true,
    strictQuery: true,
    optimisticConcurrency: true,
});

friendRequest.index({ receiver: 1 });

friendRequest.pre("save", function (next) {
    const senderId: string = this.sender.toString();
    const receiverId: string = this.receiver.toString();

    // Normalize Index
    this.senderReceiverKey = (
        senderId < receiverId ? `${senderId}_${receiverId}`: `${receiverId}_${senderId}`
    );
    next();
});

export const FriendRequest = models.FriendRequest || model("FriendRequest", friendRequest);