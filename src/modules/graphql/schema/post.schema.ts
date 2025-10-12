import { userRepo, postRepo, commentRepo } from "../../../shared/repos.shared";
import { PostResolver } from "../resolver/post.resolver";
import { PostService } from "../service/post.service";
import * as gqlTypes from '../types/post.types';
import * as gqlArgs from '../args/post.args';

class PostGQLSchema {
    private postResolver: PostResolver;

    constructor(postResolver: PostResolver) {
        this.postResolver = postResolver;
    };

    registerQuery = () => {
        return {
            getPost: {
                type: gqlTypes.getPost,
                args: gqlArgs.getPost,
                resolve: this.postResolver.getPost
            }
        };
    };

    registerMutation = () => {
        return {};
    };
};

const postService = new PostService({
    userRepo,
    postRepo,
    commentRepo
});

const postResolver = new PostResolver(postService);

const postGQLSchema = new PostGQLSchema(postResolver);

export default postGQLSchema;