import { Router } from 'express';
import { UserService } from './user.service';
import { validation } from '../../middlewares/validation.middleware';
import { userRepo } from '../../shared/repos.shared';
import { authMiddleware } from '../../shared/middlewares.shared';
import * as validators from './user.validation';
import { TokenEnum } from '../../utils/security/token.security';
import { cloudFileUpload, fileValidation } from '../../utils/multer/local/local.multer';

const router: Router = Router();

const userService = new UserService(userRepo);

router.get('/profile', authMiddleware.authentication(), userService.profile); // Done

router.post('/refresh-token', authMiddleware.authentication(TokenEnum.refresh), userService.getNewTokens); // Done

router.patch('/update-basic-info', authMiddleware.authentication(), validation(validators.updateBasicInfo), userService.updateBasicInfo); // Done

router.patch('/update-password', authMiddleware.authentication(), validation(validators.updatePassword), userService.updatePassword); // Done

router.post('/send-forget-password', validation(validators.sendForgetPassword), userService.sendForgetPassword); // Done

router.patch('/verify-forgert-password', validation(validators.verifyForgetPassword), userService.verifyForgetPassword); // Done

router.patch('/reset-password', validation(validators.resetPassword), userService.resetPassword); // Done

router.patch('/upload-user-photo', authMiddleware.authentication(), cloudFileUpload({ validation: fileValidation.image }).single("image"), userService.profileImage);

router.patch('/upload-user-cover', authMiddleware.authentication(), cloudFileUpload({ validation: fileValidation.image }).array("images", 3), userService.profileCoverImages);

router.post('/logout', validation(validators.logout), authMiddleware.authentication(), userService.logout); // Done

export default router;