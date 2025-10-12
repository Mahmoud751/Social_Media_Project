import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware.shared';
import { validation } from '../../middlewares/validation.middleware';
import * as validators from './chat.validation';
import { ChatService } from './chat.service';
import { chatRepo, userRepo } from '../../shared/repos.shared';
import { cloudFileUpload, fileValidation } from '../../utils/multer/local/local.multer';

const router: Router = Router({ mergeParams: true });

const chatService = new ChatService(userRepo, chatRepo);

router.get(
    '/',
    authMiddleware.authentication(),
    validation(validators.getChat), 
    chatService.getChat
);

router.get(
    '/group/:groupId',
    authMiddleware.authentication(),
    validation(validators.getGroupChat),
    chatService.getGroupChat
);

router.post(
    '/group',
    authMiddleware.authentication(),
    cloudFileUpload({ validation: fileValidation.image }).single("attachment"),
    validation(validators.createGroupChat),
    chatService.createGroupChat
)

export default router;