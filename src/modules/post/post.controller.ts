import { Router } from "express";
import { PostService } from "./post.service";
import { commentRepo, postRepo, userRepo } from "../../shared/repos.shared";
import { authMiddleware } from "../../shared/middleware.shared";
import { cloudFileUpload, fileValidation } from "../../utils/multer/local/local.multer";
import { validation } from "../../middlewares/validation.middleware";
import * as validators from './post.validation';
import { TokenEnum } from "../../utils/security/token.security";
import { Role } from "../../DB/models/user.model";
import { commentController } from "../comment";

const router: Router = Router();

router.use('/:postId/comment', commentController);

const postService = new PostService(userRepo, postRepo, commentRepo);

// 8 APIs

router.get(
    '/',
    authMiddleware.authentication(),
    postService.listPosts
);

router.get(
    '/:postId',
    validation(validators.getPost),
    authMiddleware.authentication(),
    postService.getPost
);

router.post(
    '/',
    authMiddleware.authentication(),
    cloudFileUpload({
        validation: fileValidation.image
    }).array("attachments", 10),
    validation(validators.createPost),
    postService.createPost
);

router.patch(
    '/:postId',
    authMiddleware.authentication(),
    cloudFileUpload({
        validation: fileValidation.image
    }).array("attachments", 10),
    validation(validators.updatePost),
    postService.updatePost
);

router.patch(
    '/:postId/like',
    authMiddleware.authentication(),
    validation(validators.likePost),
    postService.likePost
);

router.patch(
    '/:postId/restore-post',
    authMiddleware.auth(TokenEnum.access, [Role.super_admin, Role.admin]),
    validation(validators.restoreAccount),
    postService.restorePost
);

router.delete(
    '/:postId/freeze-post',
    authMiddleware.authentication(),
    validation(validators.freezePost),
    postService.freezePost
);

router.delete(
    '/:postId/delete-post',
    authMiddleware.auth(TokenEnum.access, [Role.super_admin, Role.admin]),
    validation(validators.deleteAccount),
    postService.deletePost
);

export default router;