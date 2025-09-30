import type {
    CommentDoc,
    CommentDocLean,
    CommentFilterType,
    CommentUpdateType,
    IDType,
    PaginatedDocType,
    PostDoc,
    PostDocLean,
    UpdateResultType,
    UserDoc,
    UserDocLean
} from "../../utils/types/mongoose.types";
import type { Response } from "express-serve-static-core";
import type { ICommentResponse, ICommentUpdate, ICommentWithRepliesResponse } from "./comment.entites";
import type { CommentRepository } from "../../DB/repository/comment.repository";
import type { UserRepository } from "../../DB/repository/user.repository";
import type { PostRepository } from "../../DB/repository/post.repository";
import type { IAuthRequest } from "../../utils/types/Express.types";
import { ApplicationException, BadRequestException, NotFoundException } from "../../utils/response/error.response";
import { successResponse } from "../../utils/response/sucess.response";
import { AllowComments, LikeEnum } from "../../DB/models/post.model";
import { deleteFiles, uploadFiles } from "../../utils/multer/AWS/s3.service";
import { ICommentId } from "./comment.dto";
import { IComment } from "../../DB/models/comment.model";
import { Role } from "../../DB/models/user.model";

export class CommentService {
    private userModel: UserRepository;
    private postModel: PostRepository;
    private commentModel: CommentRepository;

    constructor(userModel: UserRepository, postModel: PostRepository, commentModel: CommentRepository) {
        this.userModel = userModel;
        this.postModel = postModel;
        this.commentModel = commentModel;
    };

    createComment = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { tags }: { tags?: IDType[] } = req.body;
        const { postId }: { postId?: IDType } = req.params;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // Check If Post Meeting The Conditions Exists
        const post: PostDoc | PostDocLean | null = await this.postModel.findPost({
            filter: {
                _id: postId,
                $or: this.postModel.getPostAvailability(req.user),
                allowComments: AllowComments.allow
            }
        });
        if (!post) {
            throw new BadRequestException("Post Does Not Exist!");
        }

        // Check If The Tags Are Valid
        let users: UserDoc[] | UserDocLean[] = [];
        if (tags && tags.length) {
            users = await this.userModel.findUsers({
                filter: { _id: { $in: tags, $ne: req.user._id } },
                select: { firstName: 1, lastName: 1, email: 1 }
            });
            if (tags.length !== users.length) {
                throw new BadRequestException("Not All Tags Are Valid!");
            }
        }

        // Upload Assets
        let attachments: string[] = [];
        if (req.files?.length) {
            attachments = await uploadFiles({
                path: `users/${post.createdBy}/post/${post.assetFolderId}`,
                files: req.files as Express.Multer.File[]
            });
        }
        const comment: CommentDoc | undefined = await this.commentModel.createComment({
            ...req.body,
            attachments,
            createdBy: req.user._id,
            postId: post._id
        });

        // If Comment Failed To Be Created => Delter The Assets
        if (!comment) {
            if (attachments.length) {
                await deleteFiles(attachments);
            }
            throw new ApplicationException("Failed To Create The Comment!");
        }
        return successResponse<ICommentResponse>(res, {
            message: "Comment Created Successfully!",
            statusCode: 201,
            data: { comment }
        });
    };

    replyComment = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId, commentId }: ICommentId = req.params;
        const { tags }: { tags?: IDType[] } = req.body;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // Find If Replied-On Comment Exist & Check For Post Availability
        const comment: CommentDoc | CommentDocLean | null = await this.commentModel.findComment({
            filter: {
                _id: commentId,
                postId
            },
            options: {
                populate: {
                    path: "postId",
                    match: {
                        allowComments: AllowComments.allow,
                        $or: this.postModel.getPostAvailability(req.user)
                    }
                }
            }
        });

        // If Comment Not Exists | Post Disabled Comments | Not Allowed For User
        if (!comment || !comment.postId) {
            throw new NotFoundException("Comment Does Not Exist!");
        }

        // Check If Tags Are Valid
        let users: UserDoc[] | UserDocLean[] = [];
        if (tags) {
            users = await this.userModel.findUsers({
                filter: { _id: { $in: tags, $ne: req.user._id } },
                select: { firstName: 1, lastName: 1, email: 1 }
            });
            if (tags.length !== users.length) {
                throw new BadRequestException("Not All Tags Are Valid!");
            }
        }

        // Upload The Assets
        let attachments: string[] = [];
        if (req.files?.length) {
            const post: Partial<PostDoc | PostDocLean> = comment.postId;
            attachments = await uploadFiles({
                path: `users/${comment.createdBy}/post/${post.assetFolderId}`,
                files: req.files as Express.Multer.File[]
            });
        }
        const replyComment: CommentDoc | undefined = await this.commentModel.createComment({
            ...req.body,
            attachments,
            postId,
            commentId,
            createdBy: req.user._id
        });

        // Delete The Assets
        if (!replyComment) {
            if (attachments.length) {
                await deleteFiles(attachments);
            }
            throw new ApplicationException("Failed To Create The Comment!");
        }
        return successResponse<ICommentResponse>(res, {
            message: "Reply Comment Created Successfully!",
            statusCode: 201,
            data: { comment: replyComment }
        });
    };

    updateComment = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { commentId }: { postId?: string, commentId?: string } = req.params;
        const data: ICommentUpdate = req.body;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // Check If Comment Exists
        const comment: CommentDoc | CommentDocLean | null = await this.commentModel.findComment({
            filter: {
                _id: this.commentModel.createId(commentId as string),
                createdBy: req.user._id
            },
            select: { _id: 1, content: 1 },
            options: {
                populate: {
                    path: "postId",
                    match: {
                        $or: this.postModel.getPostAvailability(req.user)
                    },
                    select: {
                        createdBy: 1,
                        assetFolderId: 1
                    }
                }
            }
        });
        if (!comment) {
            throw new NotFoundException("Comment Does Not Exist!");
        } else if (!comment.postId) {
            throw new NotFoundException("Post Does Not Exist!");
        }

        // Check If Tags Are Valid & Upload New Attachments
        const [users, attachments] = await Promise.all([
            data.tags?.length ? await this.userModel.findUsers({
                filter: {
                    _id: { $in: data.tags }
                },
                select: {
                    firstName: 1, lastName: 1, email: 1
                }
            }) : [],
            req.files?.length ? await uploadFiles({
                path: `users/${(comment.postId as PostDocLean).createdBy}/post/${(comment.postId as PostDocLean).assetFolderId}`,
                files: req.files as Express.Multer.File[]
            }) : []
        ]);
        if (data.tags && users.length !== data.tags.length) {
            throw new BadRequestException("Not All Tags Are Valid!");
        }

        // Update The Comment with New Data
        const updated: UpdateResultType = await this.commentModel.updateComment({
            filter: {
                _id: comment._id,
                createdBy: req.user._id
            },
            updates: [
                {
                    $set: {
                        content: data.content || comment.content,
                        attachments: {
                            $setUnion: [
                                {
                                    $setDifference: ["$attachments", data.removedAttachments as string[] || []]
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
                await deleteFiles(attachments).catch(err => console.log(`Failed To Upload Files: ${err}`));
            }
            throw new ApplicationException("Failed To Update The Comment!");
        }

        if (data.removedAttachments?.length) {
            await deleteFiles(data.removedAttachments).catch(err => console.log(`Failed To Upload Files: ${err}`));
        }
        return successResponse(res, { message: "Comment Updated Successfully!" });
    };

    getComment = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId, commentId }: ICommentId = req.params;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        const comment: CommentDoc | CommentDocLean | null = await this.commentModel.findComment({
            filter: {
                _id: this.commentModel.createId(commentId as string),
                postId: this.postModel.createId(postId as string)
            }
        });
        if (!comment) {
            throw new NotFoundException("Comment Does Not Exist!");
        }
        return successResponse<ICommentResponse>(res, { data: { comment } });
    };

    getCommentWithReplies = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId, commentId }: ICommentId = req.params;
        const { page, size, all }: { page?: string, size?: string, all?: string } = req.query;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // Find The Comment and Validate Availability
        const comment: CommentDoc | CommentDocLean | null = await this.commentModel.findComment({
            filter: { _id: commentId, postId },
            options: {
                populate: {
                    path: "postId",
                    select: "none",
                    match: {
                        $or: this.postModel.getPostAvailability(req.user)
                    }
                }
            }
        });
        if (!comment) {
            throw new NotFoundException("Comment Does Not Exist!");
        }

        // Get Replies
        const replies: PaginatedDocType<IComment> = await this.commentModel.findPaginatedDocs({
            filter: { commentId: comment._id, postId },
            options: {
                populate: [{ path: "comments" }]
            },
            page: Number(page),
            size: Number(size),
            all: all as string
        })
        return successResponse<ICommentWithRepliesResponse>(res, { data: { comment, replies } });
    };

    likeComment = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId, commentId }: ICommentId = req.params;
        const { action = LikeEnum.like }: { action?: LikeEnum } = req.query;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // Check If Comment Exists & Post Exists with Conditions
        const comment: CommentDoc | CommentDocLean | null = await this.commentModel.findComment({
            filter: { _id: commentId, postId },
            options: {
                populate: {
                    path: "postId",
                    match: {
                        $or: this.postModel.getPostAvailability(req.user)
                    }
                }
            }
        });
        if (!comment || !comment.postId) {
            throw new NotFoundException("Comment Does Not Exist!");
        }

        // Update The Comment
        let updates: CommentUpdateType = (
            action === LikeEnum.like ?
                { $addToSet: { likes: req.user._id } } : { $pull: { likes: req.user._id } }
        );
        const updated: UpdateResultType = await this.commentModel.updateComment({
            filter: { _id: commentId },
            updates
        });

        // If Something happend
        if (!updated.matchedCount) {
            throw new ApplicationException("Failed To Like/Unlike The Comment!");
        }
        return successResponse(res, {});
    };

    freezeComment = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId, commentId }: { postId?:string, commentId?: string } = req.params;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist");
        }

        // If Logged-In is User => Comment Must be Created By Him
        let filter: CommentFilterType = {
            _id: this.commentModel.createId(commentId as string),
            postId: this.postModel.createId(postId as string),
            freezedAt: { $exists: false }
        };
        if (req.user.role === Role.user) {
            filter.createdBy = req.user._id
        }

        // Soft-Delete The Comment
        const comment: UpdateResultType = await this.commentModel.updateComment({
            filter,
            updates: {
                $set: {
                    freezedAt: new Date(),
                    freezedBy: req.user._id
                },
                $unset: {
                    restoredAt: 1,
                    restoreddBy: 1
                }
            }
        });
        if (!comment.modifiedCount) {
            throw new NotFoundException("Comment Does Not Exist!");
        }
        return successResponse(res, { message: "Comment Freezed Successfully!" });
    };

    restoreComment = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId }: { postId?: string } = req.params;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        const userId: IDType = this.userModel.createId(req.body.userId);
        const commentId: IDType = this.commentModel.createId(req.params.commentId as string);
        const comment: CommentDoc | CommentDocLean | null = await this.commentModel.findComment({
            filter: {
                _id: commentId,
                postId: this.postModel.createId(postId as string),
                createdBy: userId
            },
            options: {
                populate: { path: "postId" },
                paranoid: false
            }
        });
        if (!comment || !comment.postId) {
            throw new NotFoundException("Comment Does Not Exist!");
        }

        // Restore The Comment
        const updated: UpdateResultType = await this.commentModel.updateComment({
            filter: {
                _id: comment,
                createdBy: userId,
                freezedAt: { $exists: true },
                freezedBy: { $ne: userId }
            },
            updates: {
                $set: {
                    restoredAt: new Date(),
                    restoreddBy: req.user._id
                },
                $unset: {
                    freezedAt: 1,
                    freezedBy: 1
                }
            },
            options: { paranoid: false }
        });
        if (!updated.matchedCount) {
            throw new NotFoundException("Comment Does Not Exist!");
        }
        return successResponse(res, { message: "Comment Restored Successfully!" });
    };

    deleteComment = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { postId, commentId }: { postId?: string, commentId?: string } = req.params;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // Delete The Comment permanently
        const comment: CommentDoc | CommentDocLean | null = await this.commentModel.findCommentAndDelete({
            filter: {
                _id: this.commentModel.createId(commentId as string),
                postId: this.commentModel.createId(postId as string),
                freezedAt: { $exists: true }
            }
        });
        if (!comment) {
            throw new NotFoundException("Comment Does Not Exist!");
        }
        return successResponse(res, { message: "Comment Deleted Successfully!" });
    };
};