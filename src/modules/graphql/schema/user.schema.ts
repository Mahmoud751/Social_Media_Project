import {
    userRepo,
    postRepo,
    chatRepo,
    friendRequestRepo,
    tokenRepo
} from '../../../shared/repos.shared';
import { UserService } from '../service/user.service';
import { UserResolver } from '../resolver/user.resolver';
import * as gqlTypes from '../types/user.types';
import * as gqlArgs from '../args/user.args';

class UserGQLSchema {
    private userResolver: UserResolver;

    constructor(userResolver: UserResolver) {
        this.userResolver = userResolver;
    };

    registerQuery = () => {
        return {
            welcome: {
                type: gqlTypes.welcome,
                resolve: this.userResolver.welcome
            },
            dashboard: {
                type: gqlTypes.dashboard,
                resolve: this.userResolver.dashboard
            }
        };
    };

    registerMutation = () => {
        return {
        };
    };
};

const userService = new UserService({
    userRepo,
    postRepo,
    chatRepo,
    tokenRepo,
    friendRequestRepo
});

const userResolver = new UserResolver(userService);

const userGQLSchema = new UserGQLSchema(userResolver);

export default userGQLSchema;