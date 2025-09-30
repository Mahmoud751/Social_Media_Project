import { type Model, type Query, type Types, model, models, Schema } from "mongoose";
import { PostDoc, PostFilterType } from "../../utils/types/mongoose.types";
import { deleteDirectoryByPrefix } from "../../utils/multer/AWS/s3.service";
import { IComment } from "./comment.model";

export enum AllowComments {
    allow = "Allow",
    deny = "Deny"
};

export enum Availability {
    public = "Public",
    friends = "Friends",
    onlyMe = "Only_Me"
};

export enum LikeEnum {
    like = "Like",
    unlike = "Unlike"
};

export interface IPost {
    content?: string;
    attachments?: string[];
    likes?: Types.ObjectId[];
    tags?: Types.ObjectId[];
    availability?: Availability;
    allowComments?: AllowComments;
    assetFolderId?: string;
    createdBy: Types.ObjectId;
    freezedAt?: Date;
    freezedBy?: Types.ObjectId;
    restoredAt?: Date;
    restoredBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
};

const postSchema = new Schema<IPost>({
    content: {
        type: String,
        minLength: [2, "Min Length Is 2, You Entered {VALUE}"],
        maxLength: [20000, "Max Length Is 20000, You Entered {VALUE}"]
    },
    attachments: [String],
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    tags: [{ type: Schema.Types.ObjectId, ref: "User" }],
    availability: {
        type: String,
        enum: {
            values: Object.values(Availability),
            message: `Only ${Object.values(Availability)} Are Allowed`
        },
        default: Availability.public
    },
    allowComments: {
        type: String,
        enum: {
            values: Object.values(AllowComments),
            message: `Only ${Object.values(AllowComments)} Are Allowed`
        },
        default: AllowComments.allow
    },
    assetFolderId: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        required: [true, "Post Must Have A Creator"],
        ref: "User"
    },
    freezedAt: Date,
    freezedBy: Schema.Types.ObjectId,
    restoredAt: Date,
    restoredBy: Schema.Types.ObjectId
}, {
    timestamps: true,
    strictQuery: true,
    optimisticConcurrency: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

postSchema.pre<Query<any, IPost>>(["find", "findOne", "findOneAndUpdate", "updateOne"], async function (next) {
    if (this.getOptions().paranoid) {
        this.where({ freezedAt: { $exists: false } } as PostFilterType);
    }
});

postSchema.post("findOneAndDelete", async function (doc: PostDoc, next) {
    // Delete The Post's Asset FolderId and Comments
    if (doc) {
        await Promise.all([
            deleteDirectoryByPrefix(`users/${doc.createdBy}/post/${doc.assetFolderId}`),
            (models.Comment as Model<IComment>).deleteMany({ postId: doc._id })
        ]).catch(err => console.log(err.message));
    }
});

postSchema.virtual("comments", {
    localField: "_id",
    foreignField: "postId",
    ref: "Comment",
    match: { "commentId": { $exists: false } },
    justOne: true
});

export const Post = models.Post || model<IPost>("Post", postSchema);