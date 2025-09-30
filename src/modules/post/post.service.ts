import type {
    IDType,
    PaginatedDocType,
    PostDoc,
    PostDocLean,
    PostFilterType,
    PostUpdateType,
    UpdateResultType,
    UserDoc,
    UserDocLean
} from "../../utils/types/mongoose.types";
import type { UserRepository } from "../../DB/repository/user.repository";
import type { Response } from "express-serve-static-core";
import type { IAuthRequest } from "../../utils/types/Express.types";
import type { PostRepository } from "../../DB/repository/post.repository";
import { ApplicationException, BadRequestException, NotFoundException } from "../../utils/response/error.response";
import { deleteFiles, uploadFiles } from "../../utils/multer/AWS/s3.service";
import { generateFileOrDirName } from "../../utils/multer/local/local.multer";
import { successResponse } from "../../utils/response/sucess.response";
import { IPostResponse } from "./post.entites";
import { IPost, LikeEnum } from "../../DB/models/post.model";
import { IUpdatePost } from "./post.dto";
import { Role } from "../../DB/models/user.model";
import emailEvent from "../../utils/event/email.event";
import { CommentRepository } from "../../DB/repository/comment.repository";

export class PostService {
    private userModel: UserRepository;
    private postModel: PostRepository;
    private commentModel: CommentRepository;

    constructor(userModel: UserRepository, postModel: PostRepository, commentModel: CommentRepository) {
        this.userModel = userModel;
        this.postModel = postModel;
        this.commentModel = commentModel;
    };

    createPost = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { tags }: { tags?: IDType[] } = req.body;
        let users: UserDoc[] | UserDocLean[] = [];

        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        // IF There are Tags => Validate Them from DB
        if (tags && tags.length) {
            users = await this.userModel.findUsers({
                filter: { _id: { $in: tags, $ne: req.user._id } },
                select: { firstName: 1, lastName: 1, email: 1 }
            });
            if (users.length !== tags.length) {
                throw new BadRequestException("Not All Tags Are Valid!");
            }
        }

        let attachments: string[] = [];
        let assetFolderId: string = generateFileOrDirName();

        // If There are Attachments => Upload Them
        if (req.files?.length) {
            attachments = await uploadFiles({
                files: req.files as Express.Multer.File[],
                path: `users/${req.user._id}/post/${assetFolderId}`
            });
        }

        const post: PostDoc | undefined = await this.postModel.createPost({
            ...req.body,
            attachments,
            assetFolderId,
            createdBy: req.user._id
        });

        // If Post Failed To Be Created => Delete The Assets
        if (!post) {
            if (attachments.length) {
                await deleteFiles(attachments);
            }
            throw new ApplicationException("Failed To Create The Post!");
        }

        // Send Emails To Tagged People
        if (users.length) {
            emailEvent.emit("send-tag-notification-emails", users);
        }
        return successResponse<IPostResponse>(res, {
            message: "Post Created Successfully!",
            statusCode: 201,
            data: { post }
        });
    };

    getPost = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId }: { postId?: IDType } = req.params;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        const post: PostDoc | PostDocLean | null = await this.postModel.findPost({
            filter: {
                _id: postId,
                $or: this.postModel.getPostAvailability(req.user)
            }
        });
        if (!post) {
            throw new NotFoundException("Post Does Not Exist!");
        }
        return successResponse<IPostResponse>(res, { data: { post } });
    };

    likePost = async (req: IAuthRequest, res: Response): Promise<Response> => {
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        const { postId }: { postId?: IDType } = req.params;
        const userId = req.user._id as IDType;
        const { action = LikeEnum.like }: { action?: LikeEnum } = req.query;

        const updates: PostUpdateType = (
            action === LikeEnum.like ?
            { $addToSet: { likes: userId } } : { $pull: { likes: userId } }
        );

        const post: PostDoc | PostDocLean | null = await this.postModel.findPostAndUpdate({
            filter: {
                _id: postId as IDType,
                $or: this.postModel.getPostAvailability(req.user)
            },
            updates
        });

        if (!post) {
            throw new NotFoundException("Post Does Not Exist Or Failed To Update Post!");
        }
        return successResponse<IPostResponse>(res, { data: { post } });
    };

    updatePost = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId }: { postId?: IDType } = req.params;
        const data: IUpdatePost = req.body;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // Check If the post exists
        const post: PostDoc | PostDocLean | null = await this.postModel.findPost({
            filter: {
                _id: postId,
                createdBy: req.user._id
            }
        });
        if (!post) {
            throw new NotFoundException("Post Does Not Exist");
        }

        // Check If New Tags Are Valid
        let users: UserDoc[] | UserDocLean[] = [];
        if (data.tags?.length) {
            users = await this.userModel.findUsers({
                filter: { _id: { $in: data.tags } },
                select: { firstName: 1, lastName: 1, email: 1 }
            });
            if (data.tags.length !== users.length) {
                throw new BadRequestException("Not All Tags Are Valid!");
            }
        }

        // Check If There are Attachments To Upload
        let attachments: string[] = [];
        if (req.files?.length) {
            attachments = await uploadFiles({
                path: `users/${post.createdBy}/post/${post.assetFolderId}`,
                files: req.files as Express.Multer.File[]
            });
        }

        // Update The Post with New Data
        const updated: UpdateResultType = await this.postModel.updatePost({
            filter: { _id: postId },
            updates: [
                {
                    $set: {
                        content: data.content || post.content,
                        allowComments: data.allowComments || post.allowComments,
                        availability: data.availability || post.availability,
                        attachments: {
                            $setUnion: [
                                {
                                    $setDifference: ["$attachments", data.removedAttachments || []]
                                },
                                attachments
                            ]
                        },
                        tags: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$tags",
                                        !data.removedTags ? [] : data.removedTags.map((tag: string) => this.commentModel.createId(tag))
                                    ]
                                },
                                !data.tags ? [] : data.tags.map((tag: string) => this.commentModel.createId(tag))
                            ]
                        }
                    }
                }
            ]
        });

        // If Update Failed, Delete Pre-Uploaded Attachments
        if (!updated.matchedCount) {
            if (attachments.length) {
                await deleteFiles(attachments);
            }
            throw new NotFoundException("Post Does Not Exist!");
        }

        if (data.removedAttachments?.length) {
            await deleteFiles(data.removedAttachments);
        }
        return successResponse(res, { message: "Post Updated Successfully!" });
    };

    listPosts = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { page, size, all }: { page?: string, size?: string, all?: string } = req.query;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        // const posts: PaginatedDocType<IPost> = await this.postModel.findPaginatedDocs({
        //     filter: {
        //         $or: this.postModel.getPostAvailability(req.user)
        //     },
        //     page: Number(page),
        //     size: Number(size),
        //     all: all as string
        // });
        const result: PaginatedDocType<IPost> = await this.postModel.findPaginatedDocs({
            filter: {
                $or: this.postModel.getPostAvailability(req.user)
            },
            options: {
                populate: [{ path: "comments" }]
            },
            page: Number(page),
            size: Number(size),
            all: all as string
        });
        return successResponse(res, { data: { result } });
    };

    freezePost = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId }: { postId?: IDType } = req.params;

        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        let filter: PostFilterType = {
            _id: postId,
            freezeddAt: { $exists: false },
        };
        if (req.user.role !== Role.admin) {
            filter.createdBy = req.user._id
        }
        const updated: UpdateResultType = await this.postModel.updatePost({
            filter,
            updates: {
                $set: {
                    freezedAt: new Date(),
                    freezedBy: req.user?._id
                },
                $unset: {
                    restoredAt: 1,
                    restoredBy: 1
                }
            }
        });

        if (!updated.matchedCount) {
            throw new NotFoundException("Post Does Not Exist!");
        }
        return successResponse(res, { message: "Post Freezed Successfully!" });
    };

    restorePost = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId }: { postId?: IDType } = req.params;
        const { userId }: { userId?: IDType } = req.body;

        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        if (!userId) {
            throw new BadRequestException("User Id Must Be Provided!");
        }
        const post: UpdateResultType = await this.postModel.updatePost({
            filter: {
                _id: postId,
                createdBy: userId,
                restoredAt: { $exists: false },
                freezedBy: { $ne: userId }
            },
            updates: {
                $set: {
                    restoredAt: new Date(),
                    restoredBy: req.user._id
                },
                $unset: {
                    freezedAt: 1,
                    freezedBy: 1
                }
            },
            options: { paranoid: false }
        });

        if (!post.matchedCount) {
            throw new NotFoundException("Post Does Not Exist!");
        }
        return successResponse(res, { message: "Post Restored Successfully!" });
    };

    deletePost = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId }: { postId?: IDType } = req.params;
        // const post: DeleteResultType = await this.postModel.deletePost({
        //     filter: {
        //         _id: postId,
        //         freezedAt: { $exists: true }
        //     }
        // });
        // if (!post.deletedCount) {
        //     throw new NotFoundException("Post Does Not Exist!");
        // }
        const post = await this.postModel.findPostAndDelete({
            filter: {
                _id: postId,
                freezedAt: { $exists: true }
            }
        });
        if (!post) {
            throw new NotFoundException("Post Does Not Exist!");
        }
        return successResponse(res, { message: "Post Deleted Successfully!" });
    };
};