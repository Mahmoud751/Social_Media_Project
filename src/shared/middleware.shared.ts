import { AuthMiddleware } from "../middlewares/authentication.middleware";
import { userRepo } from "./repos.shared";

export const authMiddleware = new AuthMiddleware(userRepo);