import { User } from "../DB/models/user.model";
import { Post } from "../DB/models/post.model";
import { Token } from "../DB/models/token.model";
import { Comment } from "../DB/models/comment.model";
import { CommentRepository } from "../DB/repository/comment.repository";
import { PostRepository } from "../DB/repository/post.repository";
import { TokenRepository } from "../DB/repository/token.repository";
import { UserRepository } from "../DB/repository/user.repository";
import { FriendRequestRepository } from "../DB/repository/friendRequest.repository";
import { FriendRequest } from "../DB/models/friendRequest.model";
import { ChatRepository } from "../DB/repository/chat.repository";
import { Chat } from "../DB/models/chat.model";

export const tokenRepo = new TokenRepository(Token);

export const commentRepo = new CommentRepository(Comment);

export const postRepo = new PostRepository(Post, commentRepo);

export const friendRequestRepo = new FriendRequestRepository(FriendRequest);

export const userRepo = new UserRepository(User, friendRequestRepo);

export const chatRepo = new ChatRepository(Chat);