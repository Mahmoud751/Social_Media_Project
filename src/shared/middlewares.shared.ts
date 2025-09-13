import { userRepo } from "./repos.shared";
import { AuthMiddleware } from "../middlewares/authentication.middleware";

export const authMiddleware = new AuthMiddleware(userRepo);