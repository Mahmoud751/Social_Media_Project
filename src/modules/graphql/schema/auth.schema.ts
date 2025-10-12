import { AuthenticationResolver } from "../resolver/auth.resolver";
import * as gqlTypes from '../types/auth.types';
import * as gqlArgs from '../args/auth.args';
import { AuthenticationService } from "../service/auth.service";
import { userRepo } from "../../../shared/repos.shared";

class AuthGQLSchema {
    private authResolver: AuthenticationResolver;

    constructor(authResolver: AuthenticationResolver) {
        this.authResolver = authResolver;
    };

    registerQuery = () => {
        return {};
    };

    registerMutation = () => {
        return {
            signupWithGmail: {
                type: gqlTypes.signupWithGmail,
                args: gqlArgs.signupWithGmail,
                resolve: this.authResolver.signupWithGmail
            },
            loginWithGmail: {
                type: gqlTypes.loginWithGmail,
                args: gqlArgs.loginWithGmail,
                resolve: this.authResolver.loginWithGmail
            },
            signWithGmail: {
                type: gqlTypes.signWithGmail,
                args: gqlArgs.signWithGmail,
                resolve: this.authResolver.signWithGmail
            },
            signup: {
                type: gqlTypes.signup,
                args: gqlArgs.signup,
                resolve: this.authResolver.signup
            },
            login: {
                type: gqlTypes.login,
                args: gqlArgs.login,
                resolve: this.authResolver.login
            },
            twoSVLoginConfirmation: {
                type: gqlTypes.twoSVLoginConfirmation,
                args: gqlArgs.twoSVLoginConfirmation,
                resolve: this.authResolver.twoSVLoginConfirmation
            },
            confirmEmail: {
                type: gqlTypes.confirmEmail,
                args: gqlArgs.confirmEmail,
                resolve: this.authResolver.confirmEmail
            },
            resendConfirmEmail: {
                type: gqlTypes.resendConfirmEmail,
                args: gqlArgs.resendConfirmEmail,
                resolve: this.authResolver.resendConfirmEmail
            }
        };
    };
};

const authGQLSchema = new AuthGQLSchema(new AuthenticationResolver(new AuthenticationService(userRepo)));

export default authGQLSchema;