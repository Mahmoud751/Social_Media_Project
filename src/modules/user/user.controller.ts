import { Router } from 'express';
import { UserService } from './user.service';
import { validation } from '../../middlewares/validation.middleware';
import { userRepo } from '../../shared/repos.shared';
import { authMiddleware } from '../../shared/middlewares.shared';
import * as validators from './user.validation';
import { TokenEnum } from '../../utils/security/token.security';
import { cloudFileUpload, fileValidation } from '../../utils/multer/local/local.multer';
import { Role } from '../../DB/models/User.model';

const router: Router = Router();

const userService = new UserService(userRepo);

router.get(
    '/profile',
    authMiddleware.authentication(),
    userService.profile
);

router.post(
    '/refresh-token',
    authMiddleware.authentication(TokenEnum.refresh),
    userService.getNewTokens
);

router.patch(
    '/update-basic-info',
    authMiddleware.authentication(),
    validation(validators.updateBasicInfo),
    userService.updateBasicInfo
);

router.patch(
    '/update-password',
    authMiddleware.authentication(),
    validation(validators.updatePassword),
    userService.updatePassword
);

router.post(
    '/send-forget-password',
    validation(validators.sendForgetPassword),
    userService.sendForgetPassword
);

router.patch(
    '/verify-forgert-password',
    validation(validators.verifyForgetPassword),
    userService.verifyForgetPassword
);

router.patch(
    '/reset-password',
    validation(validators.resetPassword),
    userService.resetPassword
);

router.patch(
    '/upload-user-photo',
    authMiddleware.authentication(),
    cloudFileUpload({ validation: fileValidation.image }).single("image"),
    validation(validators.profileImage),
    userService.profileImage
);

router.patch(
    '/upload-user-cover',
    authMiddleware.authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array("images", 3),
    validation(validators.ProfileCoverImages),
    userService.profileCoverImages
);

router.delete(
    '{/:userId}/freeze-account',
    authMiddleware.authentication(),
    validation(validators.freezeAccount),
    userService.freezeAccount
);

router.delete(
    '/:userId/delete-account',
    authMiddleware.auth(TokenEnum.access, [Role.admin]),
    validation(validators.deleteAccount),
    userService.deleteAccount
);

router.post(
    '/:userId/restore-account',
    authMiddleware.auth(TokenEnum.access, [Role.admin]),
    validation(validators.restoreAccount),
    userService.restoreAccount
);

router.post(
    '/logout',
    validation(validators.logout),
    authMiddleware.authentication(),
    userService.logout
);

export default router;