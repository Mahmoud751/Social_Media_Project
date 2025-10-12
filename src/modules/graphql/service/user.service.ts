import { ChatRepository } from "../../../DB/repository/chat.repository";
import { FriendRequestRepository } from "../../../DB/repository/friendRequest.repository";
import { PostRepository } from "../../../DB/repository/post.repository";
import { TokenRepository } from "../../../DB/repository/token.repository";
import { UserRepository } from "../../../DB/repository/user.repository";
import { PostDoc, PostDocLean, UserDoc, UserDocLean } from "../../../utils/types/mongoose.types";
import { IResponse } from "../types/types";

interface IUserServiceDeps {
    userRepo: UserRepository;
    postRepo: PostRepository;
    chatRepo: ChatRepository;
    tokenRepo: TokenRepository;
    friendRequestRepo: FriendRequestRepository;
};

export class UserService {
    private userRepo: UserRepository;
    private postRepo: PostRepository;
    private chatRepo: ChatRepository;
    private tokenRepo: TokenRepository;
    private friendRequestRepo: FriendRequestRepository;

    constructor(dependencies: IUserServiceDeps) {
        this.userRepo = dependencies.userRepo;
        this.postRepo = dependencies.postRepo;
        this.chatRepo = dependencies.chatRepo;
        this.tokenRepo = dependencies.tokenRepo;
        this.friendRequestRepo = dependencies.friendRequestRepo;
    };

    welcome = (): string => {
        return "Hello World!";
    };

    dashboard = async (): Promise<IResponse> => {
        const [users, posts]: [(UserDoc[] | UserDocLean[]), (PostDoc[] | PostDocLean[])] = await Promise.all([
            this.userRepo.findUsers({ options: { lean: false } }),
            this.postRepo.findPosts({ options: { lean: false } })
        ]);
        return {
            message: "Done",
            statusCode: 200,
            data: { users, posts }
        };
    };
};