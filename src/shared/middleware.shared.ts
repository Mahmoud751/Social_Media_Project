import { AuthGraphQL } from "../middlewares/auth/graphql.auth";
import { AuthMiddleware } from "../middlewares/authentication.middleware";
import { tokenRepo, userRepo } from "./repos.shared";

export const authMiddleware = new AuthMiddleware(userRepo);

export const authGraphQL = new AuthGraphQL(userRepo, tokenRepo);