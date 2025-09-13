import { Token } from "../DB/models/Token.model";
import { User } from "../DB/models/User.model";
import { TokenRepository } from "../DB/repository/Token.repository";
import { UserRepository } from "../DB/repository/User.repository";

export const userRepo = new UserRepository(User);
export const tokenRepo = new TokenRepository(Token);