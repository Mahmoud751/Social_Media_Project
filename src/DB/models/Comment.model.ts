import { deleteFiles } from "../../utils/multer/AWS/s3.service";
import type {
    CommentDoc,
    CommentDocLean,
    CommentFilterType,
    PostDoc,
    PostDocLean,
    UserDoc,
    UserDocLean
} from "../../utils/types/mongoose.types";
import { model, models, Schema, type Types } from "mongoose";

export interface IComment {
    content?: string;
    attachments?: string[];
    tags?: Types.ObjectId[];
    likes?: Types.ObjectId[];
    postId: Types.ObjectId | Partial<PostDoc | PostDocLean>;
    createdBy: Types.ObjectId | Partial<UserDoc | UserDocLean>;
    commentId?: Types.ObjectId | Partial<CommentDoc | CommentDocLean>;
    freezedAt?: Date;
    freezedBy?: Types.ObjectId;
    restoredAt?: Date;
    restoreddBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
};

const commentSchema = new Schema<IComment>({
    content: {
        type: String,
        minLength: [2, "Min Length Is 2, You Entered {VALUE}"],
        maxLength: [20000, "Max Length Is 20000, You Entered {VALUE}"]
    },
    attachments: [String],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    postId: {
        type: Schema.Types.ObjectId,
        ref: "Post"
    },
    commentId: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    tags: [{ type: Schema.Types.ObjectId, ref: "User" }],
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    freezedAt: Date,
    freezedBy: Schema.Types.ObjectId,
    restoredAt: Date,
    restoreddBy: Schema.Types.ObjectId
}, {
    timestamps: true,
    strictQuery: true,
    optimisticConcurrency: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

commentSchema.pre(["find", "findOne", "findOneAndUpdate", "updateOne"], function (next) {
    if (this.getOptions().paranoid) {
        this.where({ freezedAt: { $exists: false } } as CommentFilterType);
    }
    console.log(this.getQuery());
    next();
});

commentSchema.post("findOneAndDelete", async function (doc: CommentDoc, next) {
    if (doc.attachments && doc.attachments.length) {
        await deleteFiles(doc.attachments);
    }
});

commentSchema.virtual("comments", {
    localField: "_id",
    foreignField: "commentId",
    ref: "Comment",
    // justOne: true
});

export const Comment = models.Comment || model<IComment>("Comment", commentSchema);