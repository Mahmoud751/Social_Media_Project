import { IAuthGraph } from "../../../middlewares/auth/graphql.auth";
import { IDType, UserDoc, UserDocLean } from "../../../utils/types/mongoose.types";
import { PostService } from "../service/post.service";

export class PostResolver {
    private postService: PostService;

    constructor(postService: PostService) {
        this.postService = postService;
    };

    getPost = (parent: any, args: { user: UserDoc | UserDocLean, postId: IDType }, context: IAuthGraph) => {
        if (!context.user) {
            throw context.error;
        }
        return this.postService.getPost(context.user, args.postId);
    }
};