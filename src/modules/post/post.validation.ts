import { z } from "zod";
import { AllowComments, Availability } from "../../DB/models/post.model";
import { generalFields } from "../../middlewares/validation.middleware";
import { fileValidation } from "../../utils/multer/local/local.multer";

export const createPost = {
    body: z.strictObject({
        content: generalFields.content.optional(),
        attachments: z.array(generalFields.file({
            fieldname: "attachments",
            mimetype: fileValidation.image
        })).max(10).optional(),
        availability: generalFields.availability.default(Availability.public),
        allowComments: generalFields.allowComments.default(AllowComments.allow),
        tags: z.array(generalFields.id).max(10).optional()
    }).superRefine((data, ctx) => {
        if (data.attachments && !data.attachments.length && !data.content) {
            ctx.addIssue({
                code: "custom",
                message: "No Content Or Attachments Are Provided!",
                path: ["content", "attachments"]
            });
        }

        if (data.tags && data.tags.length !== (new Set(data.tags)).size) {
            ctx.addIssue({
                code: "custom",
                message: "Duplicate Tags Found!",
                path: ["tags"]
            });
        }
    })
};

export const updatePost = {
    params: z.strictObject({
        postId: generalFields.id
    }),
    body: z.strictObject({
        content: generalFields.content.optional(),
        availability: generalFields.availability.optional(),
        allowComments: generalFields.allowComments.optional(),

        attachments: z.array(generalFields.file({
            fieldname: "attachments", mimetype: fileValidation.image
        })).max(10).optional(),
        removedAttachments: z.array(z.string()).max(10).optional(),
        tags: z.array(generalFields.id).max(10).optional(),
        removedTags: z.array(generalFields.id).max(10).optional()
    }).superRefine((data, ctx) => {
        if (!Object.values(data).length) {
            ctx.addIssue({
                code: "custom",
                message: "No Data Provided",
                path: ["all"]
            });
        }

        if (data.tags?.length && data.tags.length !== new Set(data.tags).size) {
            ctx.addIssue({
                code: "custom",
                message: "Duplicate Tags Found!",
                path: ["tags"]
            });
        }
    })
};

export const likePost = {
    params: z.strictObject({
        postId: generalFields.id
    }),
    query: z.strictObject({
        action: generalFields.action
    })
};

export const freezePost = {
    params: z.strictObject({
        postId: generalFields.id
    })
};

export const restoreAccount = {
    params: z.strictObject({
        postId: generalFields.id
    }),
    body: z.strictObject({
        userId: generalFields.id
    })
};

export const deleteAccount = freezePost;

export const getPost = freezePost;