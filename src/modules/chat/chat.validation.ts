import { z } from 'zod';
import { generalFields } from '../../middlewares/validation.middleware';
import { fileValidation } from '../../utils/multer/local/local.multer';
import { BadRequestException } from '../../utils/response/error.response';

export const getChat = {
    params: z.strictObject({
        userId: generalFields.id
    }),
    query: z.strictObject({
        page: z.coerce.number().int().min(1).optional(),
        size: z.coerce.number().int().min(1).optional(),
    })
};

export const createGroupChat = {
    body: z.strictObject({
        participants: z.array(generalFields.id).min(1, "Min Length Is 1").max(2000, "Max Length Is 2000"),
        group: z.string("Invalid Type!").min(2, "Min Length Is 2").max(5000, "Max Length Is 5000"),
        attachment: generalFields.file({ fieldname: "attachment", mimetype: fileValidation.image }).optional()
    }).superRefine((data, ctx) => {
        if (data.participants && data.participants.length !== new Set(data.participants).size) {
            throw new BadRequestException("Duplicate Participants Found!");
        }
    })
};

export const getGroupChat = {
    params: z.strictObject({
        groupId: generalFields.id
    }),
    query: getChat.query
};