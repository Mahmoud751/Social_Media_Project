import type {
    UserDoc,
    UserDocLean,
    UserFilterType,
    UserUpdateType,
    UserOptionsType,
    UserSelectionType,
    UserUpdateOptionsType,
    UserDeletionOptionsType,
    IDType,
    UpdateResultType,
    DeleteResultType,
    CreateOptionsType,
} from "../../utils/types/mongoose.types";
import type { IUser } from "../models/user.model";
import type { IPost } from "../models/post.model";
import type { IComment } from "../models/comment.model";
import { type ClientSession, type Model, startSession, models } from "mongoose";
import { DatabaseRepository } from "./db.repository";
import { deleteDirectoryByPrefix } from "../../utils/multer/AWS/s3.service";
import { FriendRequestRepository } from "./friendRequest.repository";
import { NotFoundException } from "../../utils/response/error.response";
import { DeleteObjectCommandOutput } from "@aws-sdk/client-s3";

export class UserRepository extends DatabaseRepository<IUser> {
    private friendRequestModel: FriendRequestRepository;
    constructor(model: Model<IUser>, friendRequestModel: FriendRequestRepository) {
        super(model);
        this.friendRequestModel = friendRequestModel;
    };

    createUser = async (
        data: Partial<IUser>,
        options?: CreateOptionsType
    ): Promise<UserDoc | undefined> => {
        return (await this.create([data], options))[0];
    };

    findUsers = async ({
        filter,
        select,
        options
    }: {
        filter?: UserFilterType,
        select?: UserSelectionType,
        options?: UserOptionsType
    }): Promise<UserDoc[] | UserDocLean[]> => {
        return await this.find(filter, select, options);
    };

    findUser = async ({
        filter,
        select,
        options
    }: {
        filter: UserFilterType,
        select?: UserSelectionType,
        options?: UserOptionsType
    }): Promise<UserDoc | UserDocLean | null> => {
        return await this.findOne(filter, select, options);
    };

    updateUser = async ({
        filter,
        updates,
        options
    }: {
        filter: UserFilterType,
        updates: UserUpdateType,
        options?: UserUpdateOptionsType
    }): Promise<UpdateResultType> => {
        return await this.updateOne(filter, updates, options);
    };

    // deleteUser = async ({
    //     filter,
    //     options,
    // }: {
    //     filter: UserFilterType,
    //     options?: UserDeletionOptionsType
    // }): Promise<DeleteResultType> => {
    //     return await this.deleteOne(filter, options);
    // };

    deleteUser = async ({
        filter,
        options,
    }: {
        filter: UserFilterType,
        options?: UserDeletionOptionsType
    }): Promise<DeleteResultType> => {
        const session: ClientSession = await startSession();
        session.startTransaction();

        try {
            const Post = models.Post as Model<IPost>;
            const Comment = models.Comment as Model<IComment>;

            // Ensure User Exists Then Delete
            const user: UserDoc | UserDocLean | null = await this.model.findOneAndDelete(
                filter, { lean: true }
            ).select("_id").session(session);
            if (!user) {
                throw new NotFoundException("User Does Not Exist!");
            }

            /*
                Prepare Tasks:
                -----------------
                1- Delete Any User's Posts
                2- Delete User's Posts' Comments (May Be Added)
                3- Delete User's Assets
             */
            const tasks: Promise<DeleteResultType | DeleteObjectCommandOutput>[] = [
                Post.deleteMany({ createdBy: user._id }).session(session),
                deleteDirectoryByPrefix(`users/${user._id}`)
            ];

            // Get Posts' IDs For User If Exist
            const postIds: IDType[] = await Post.distinct("_id", { createdBy: user._id });
            if (postIds.length) {
                tasks.push(Comment.deleteMany({ postId: { $in: postIds } }).session(session));
            }

            // Fire
            await Promise.allSettled(tasks);

            // Successful Transaction
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            return { acknowledged: false, deletedCount: 0 };
        } finally {
            await session.endSession();
        }
        return { acknowledged: true, deletedCount: 1 };
    };

    removeFriendship = async (
        userId: string, friendId: string
    ): Promise<boolean> => {
        const session: ClientSession = await startSession();
        session.startTransaction();

        try {
            // Remove Friend ID From Each User 
            const [user, friend, friendRequest]: [UpdateResultType, UpdateResultType, DeleteResultType] = await Promise.all([
                // Delete Friend IDs from each User
                this.model.updateOne({
                    _id: userId,
                    friends: friendId
                }, {
                    $pull: { friends: friendId }
                }).session(session),
                this.model.updateOne({
                    _id: friendId,
                    friends: userId
                }, {
                    $pull: { friends: userId }
                }).session(session),
                // Delete Friend Request
                this.friendRequestModel.deleteOne({
                    senderReceiverKey: this.friendRequestModel.getCompounIndex(
                        userId.toString(), friendId.toString()
                    )
                })
            ]);

            if (!user.modifiedCount || !friend.modifiedCount || !friendRequest.deletedCount) {
                return false;
            }
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            return false;
        } finally {
            session.endSession();
        }
        return true;
    };

    findUserAndUpdate = async ({
        filter,
        updates,
        options
    }: {
        filter: UserFilterType,
        updates: UserUpdateType,
        options?: UserUpdateOptionsType
    }): Promise<UserDoc | UserDocLean | null> => {
        return await this.findOneAndUpdate(filter, updates, options);
    };
};