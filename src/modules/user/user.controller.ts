import { Router } from 'express';
import { UserService } from './user.service';
import { validation } from '../../middlewares/validation.middleware';
import { TokenEnum } from '../../utils/security/token.security';
import { cloudFileUpload, fileValidation } from '../../utils/multer/local/local.multer';
import { Role } from '../../DB/models/user.model';
import { authMiddleware } from '../../shared/middleware.shared';
import { chatRepo, friendRequestRepo, postRepo, userRepo } from '../../shared/repos.shared';
import * as validators from './user.validation';
import { chatController } from '../chat';

const router: Router = Router();

router.use('/:userId/chat', chatController);

const userService = new UserService(userRepo, chatRepo, postRepo, friendRequestRepo);

// 25 APIs

router.get(
    '/profile',
    authMiddleware.authentication(),
    userService.profile
);

router.get(
    '/dashboard',
    authMiddleware.auth(TokenEnum.access, [Role.admin, Role.super_admin]),
    userService.dashboard
);

router.post(
    '/refresh-token',
    authMiddleware.authentication(TokenEnum.refresh),
    userService.getNewTokens
);

router.post(
    '/:userId/send-friend-request',
    authMiddleware.authentication(),
    validation(validators.sendFriendRequest),
    userService.sendFriendRequest
);

router.patch(
    '/:requestId/friend-request-action',
    authMiddleware.authentication(),
    validation(validators.friendRequestAction),
    userService.friendRequestAction
);

router.patch(
    '/:userId/change-role',
    authMiddleware.auth(TokenEnum.access, [Role.super_admin, Role.admin]),
    validation(validators.changeRole),
    userService.changeRole
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
    '/request-change-email',
    authMiddleware.authentication(),
    validation(validators.requestEmailChange),
    userService.requestEmailChange
);

router.get(
    '/verify-email-change',
    userService.verifyNewEmail
);

router.patch(
    '/:userId/block-user',
    authMiddleware.authentication(),
    validation(validators.blockUser),
    userService.blockUser
);

router.patch(
    '/:userId/revoke-block-user',
    authMiddleware.authentication(),
    validation(validators.revokeBlock),
    userService.revokeBlock
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
    // cloudFileUpload({ validation: fileValidation.image }).single("image"),
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

router.patch(
    '/enable-2sv',
    authMiddleware.authentication(),
    userService.enable2SV
);

router.patch(
    '/verify-2sv-activation',
    authMiddleware.authentication(),
    validation(validators.verify2SV),
    userService.verify2SV
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

router.delete(
    '/:requestId/cancel-friend-request',
    authMiddleware.authentication(),
    validation(validators.cancelFriendRequest),
    userService.cancelFriendRequest
);

router.delete(
    '/:userId/remove-friend',
    authMiddleware.authentication(),
    validation(validators.removeFriend),
    userService.removeFriend
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