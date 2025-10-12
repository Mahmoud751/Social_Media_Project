import { GraphQLError } from "graphql";
import { UserDoc, UserDocLean } from "../../../utils/types/mongoose.types";
import type { UserService } from "../service/user.service";
import { authorizationGQL, IAuthGraph } from "../../../middlewares/auth/graphql.auth";
import { Role } from "../../../DB/models/user.model";

export class UserResolver {
    private userService: UserService;

    constructor(userService: UserService) {
        this.userService = userService;
    };

    welcome = (parent: unknown, args: any, context: any): string => {
        return this.userService.welcome();
    };

    dashboard = (parent: unknown, args: any, context: IAuthGraph) => {
        if (!context.user) {
            throw context.error;
        }

        // Authorization
        authorizationGQL(context.user.role);

        return this.userService.dashboard();
    };
};