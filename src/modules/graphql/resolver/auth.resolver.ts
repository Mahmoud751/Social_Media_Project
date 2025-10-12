import { IDToken, IEmail, IEmailConfirmation, ILogin, ISignup } from "../DTOs/auth.dto";
import { AuthenticationService } from "../service/auth.service";

export class AuthenticationResolver {
    private authService: AuthenticationService;

    constructor(authService: AuthenticationService) {
        this.authService = authService;
    };

    signupWithGmail = (parent: any, args: IDToken) => {
        return this.authService.signupWithGmail(args.idToken);
    };

    loginWithGmail = (parent: any, args: IDToken) => {
        return this.authService.loginWithGmail(args.idToken);
    };

    signWithGmail = (parent: any, args: IDToken) => {
        return this.authService.signWithGmail(args.idToken);
    };

    signup = (parent: any, args: ISignup) => {
        return this.authService.signup(args);
    };

    login = (parent: any, args: ILogin) => {
        return this.authService.login(args);
    };

    twoSVLoginConfirmation = (parent: any, args: IEmailConfirmation) => {
        return this.authService.twoSVLoginConfirmation(args);
    };

    confirmEmail = (parent: any, args: IEmailConfirmation) => {
        return this.authService.confirmEmail(args);
    };

    resendConfirmEmail = (parent: any, args: IEmail) => {
        return this.authService.resendConfirmEmail(args.email);
    };
};