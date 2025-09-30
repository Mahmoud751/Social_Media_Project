import { z } from "zod";
import { generalFields } from "../../middlewares/validation.middleware";
import { fileValidation } from "../../utils/multer/local/local.multer";

export const createComment = {
    params: z.strictObject({
        postId: generalFields.id
    }),
    body: z.strictObject({
        content: generalFields.content.optional(),
        attachments: z.array(generalFields.file({
            fieldname: "attachments", mimetype: fileValidation.image
        })).max(5).optional(),
        tags: z.array(generalFields.id).max(10).optional(),
    }, "Body Must Be Provided").superRefine((data, ctx) => {
        if (!data.content && (!data.attachments || !data.attachments.length)) {
            ctx.addIssue({
                code: "custom",
                message: "No Content Or Attachments Are Provided!",
                path: ["content", "attachments"]
            })
        }

        if (data.tags && data.tags.length !== new Set(data.tags).size) {
            ctx.addIssue({
                code: "custom",
                message: "Duplicate Tags Found!",
                path: ["tags"]
            });
        }
    })
};

export const replyComment = {
    params: z.strictObject({
        postId: generalFields.id,
        commentId: generalFields.id
    }),
    body: createComment.body
};

export const getComment = {
    params: replyComment.params,
};

export const updateComment = {
    params: replyComment.params,
    body: z.strictObject({
        content: generalFields.content.optional(),
        attachments: z.array(generalFields.file({
            fieldname: "attachments", mimetype: fileValidation.image
        })).max(5).optional(),
        removedAttachments: z.array(z.string()).max(5).optional(),
        tags: z.array(generalFields.id).max(10).optional(),
        removedTags: z.array(generalFields.id).max(10).optional()
    }, "Body Must Be Provided").superRefine((data, ctx) => {
        if (!Object.values(data).length) {
            ctx.addIssue({
                code: "custom",
                message: "No Data Provided",
                path: ["content", "attachments", "removedAttachments", "tags", "removedTags"]
            });
        }

        if (data.tags && data.tags.length !== new Set(data.tags).size) {
            ctx.addIssue({
                code: "custom",
                error: "Duplicate Tags Found!",
                path: ["tags"]
            });
        }
    })
};

export const likeComment = {
    params: replyComment.params,
    query: z.strictObject({
        action: generalFields.action
    })
};

export const freezeComment = {
    params: replyComment.params
};

export const deleteComment = {
    params: replyComment.params
};

export const restoreComment = {
    params: replyComment.params,
    body: z.strictObject({
        userId: generalFields.id
    })
};