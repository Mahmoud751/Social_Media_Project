import { Router } from "express";
import { CommentService } from "./comment.service";
import { authMiddleware } from "../../shared/middleware.shared";
import { cloudFileUpload, fileValidation } from "../../utils/multer/local/local.multer";
import { validation } from "../../middlewares/validation.middleware";
import { commentRepo, postRepo, userRepo } from "../../shared/repos.shared";
import * as validators from './comment.validation';
import { TokenEnum } from "../../utils/security/token.security";
import { Role } from "../../DB/models/user.model";

const router: Router = Router({ mergeParams: true });

const commentService = new CommentService(userRepo, postRepo, commentRepo);

// 9 APIs

router.post(
    '/',
    authMiddleware.authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array("attachments", 5),
    validation(validators.createComment),
    commentService.createComment
);

router.post(
    '/:commentId/reply',
    authMiddleware.authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array("attachments", 5),
    validation(validators.replyComment),
    commentService.replyComment
);

router.get(
    '/:commentId/replies',
    authMiddleware.authentication(),
    commentService.getCommentWithReplies
);

router.get(
    '/:commentId',
    authMiddleware.authentication(),
    validation(validators.getComment),
    commentService.getComment
);

router.patch(
    '/:commentId/like',
    authMiddleware.authentication(),
    validation(validators.likeComment),
    commentService.likeComment
);

router.patch(
    '/:commentId',
    authMiddleware.authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array("attachments", 5),
    validation(validators.updateComment),
    commentService.updateComment
);

router.patch(
    '/:commentId/restore-comment',
    authMiddleware.auth(TokenEnum.access, [Role.super_admin, Role.admin]),
    validation(validators.restoreComment),
    commentService.restoreComment
);

router.delete(
    '/:commentId/freeze-comment',
    authMiddleware.authentication(),
    validation(validators.freezeComment),
    commentService.freezeComment
);

router.delete(
    '/:commentId/delete-comment',
    authMiddleware.auth(TokenEnum.access, [Role.super_admin, Role.admin]),
    validation(validators.deleteComment),
    commentService.deleteComment
);

export default router;