import type { IDType, PostDoc, PostDocLean, UserDoc, UserDocLean } from "../../../utils/types/mongoose.types";
import type { CommentRepository } from "../../../DB/repository/comment.repository";
import type { PostRepository } from "../../../DB/repository/post.repository";
import type { UserRepository } from "../../../DB/repository/user.repository";
import type { IResponse } from "../types/types";
import { GraphQLError } from "graphql";

interface IPostServiceDeps {
    userRepo: UserRepository;
    postRepo: PostRepository;
    commentRepo: CommentRepository;
};

export class PostService {
    private useRepo: UserRepository;
    private postRepo: PostRepository;
    private commentRepo: CommentRepository;

    constructor(dependencies: IPostServiceDeps) {
        this.useRepo = dependencies.userRepo;
        this.postRepo = dependencies.postRepo;
        this.commentRepo = dependencies.commentRepo;
    };

    getPost = async (user: UserDoc | UserDocLean, postId: IDType): Promise<IResponse<{ post: PostDoc | PostDocLean }>> => {
        if (!user) {
            throw new GraphQLError("User Does Not Exist!", {
                extensions: {
                    statusCode: 404
                }
            });
        }

        // Find Post
        const post: PostDoc | PostDocLean | null = await this.postRepo.findPost({
            filter: {
                _id: postId,
                $or: this.postRepo.getPostAvailability(user)
            }
        });
        if (!post) {
            throw new GraphQLError("Post Does Not Exist!", {
                extensions: {
                    statusCode: 404
                }
            });
        }

        return {
            message: "Done",
            statusCode: 200,
            data: { post }
        };
    };
};