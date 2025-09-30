import { validation } from "../../middlewares/validation.middleware";
import { Router } from "express";
import * as validators from './auth.validation';
import { AuthenticationService } from "./auth.service";
import { userRepo } from "../../shared/repos.shared";

const router: Router = Router();

const authService = new AuthenticationService(userRepo);

// 8 APIs

router.post(
    '/signup',
    validation(validators.signup),
    authService.signup
);

router.post(
    '/login',
    validation(validators.login),
    authService.login
);

router.post(
    '/login-with-2sv',
    validation(validators.twoSVLoginConfirmation),
    authService.twoSVLoginConfirmation
);

router.post(
    '/signup-with-gmail',
    authService.signupWithGmail
);

router.post(
    '/login-with-gmail',
    authService.loginWithGmail
);

router.post(
    '/sign-with-gmail',
    authService.signWithGmail
);

router.patch(
    '/confirm-email',
    validation(validators.confirmEmail),
    authService.confirmEmail
);

router.post(
    '/resend-confirm-email',
    validation(validators.resendConfirmEmail),
    authService.resendConfirmEmail
);

export default router;