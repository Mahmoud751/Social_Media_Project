import { z } from "zod";
import { generalFields } from "../../middlewares/validation.middleware";
import type { IUpdatePassword } from "./user.dto";
import { isValidObjectId } from "mongoose";
import { fileValidation } from "../../utils/multer/local/local.multer";
import { Role } from "../../DB/models/user.model";

export const sendForgetPassword = {
    body: z.strictObject({
        email: generalFields.email
    })
};

export const verifyForgetPassword = {
    body: sendForgetPassword.body.extend({
        otp: generalFields.otp
    })
};

export const resetPassword = {
    body: sendForgetPassword.body.extend({
        otp: generalFields.otp,
        password: generalFields.password
    })
};

export const verify2SV = {
    body: z.strictObject({
        otp: generalFields.otp
    })
};

export const updateBasicInfo = {
    body: z.strictObject({
        username: generalFields.username.optional(),
        age: generalFields.age.optional(),
        phone: generalFields.phone.optional(),
        gender: generalFields.gender.optional(),
        address: generalFields.address.optional()
    })
};

export const profileImage = {
    body: z.strictObject({
        originalname: z.string("Invalid Type"),
        ContentType: z.enum(fileValidation.image, "Not Supported Ext!")
    })
};

export const ProfileCoverImages = {
    files: z.array(
        generalFields.file({ fieldname: "images", mimetype: fileValidation.image })
    )
};

export const logout = {
    body: z.strictObject({
        flag: generalFields.flag
    })
};

export const updatePassword = {
    body: logout.body.extend({
        oldPassword: generalFields.password,
        newPassword: generalFields.password,
    }).refine((data: IUpdatePassword) => {
        return data.oldPassword !== data.newPassword;
    }, {
        error: "Old Password Cannot Be Equal To New Password!",
        path: ["oldPassword"]
    })
};

export const requestEmailChange = {
    body: z.strictObject({
        newEmail: generalFields.email
    })
};

export const freezeAccount = {
    params: z.object({
        userId: generalFields.id.optional()
    }).refine((data) => {
        return data.userId ? isValidObjectId(data.userId) : true;
    }, {
        error: "Invalid userId Format!",
        path: ["userId"]
    })
};

export const restoreAccount = {
    params: z.strictObject({
        userId: generalFields.id
    })
};

export const changeRole = {
    params: restoreAccount.params,
    body: z.strictObject({
        role: z.enum(Role)
    })
};

export const friendRequestAction = {
    params: z.strictObject({
        requestId: generalFields.id
    }),
    body: z.strictObject({
        status: z.enum(["Accepted", "Declined"])
    })
};

export const cancelFriendRequest = {
    params: friendRequestAction.params
};


export const removeFriend = restoreAccount;

export const blockUser = restoreAccount;

export const revokeBlock = restoreAccount;

export const sendFriendRequest = restoreAccount;

export const deleteAccount = restoreAccount;