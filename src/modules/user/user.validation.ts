import { z } from "zod";
import { generalFields } from "../../middlewares/validation.middleware";
import type { IUpdatePassword } from "./user.dto";
import { isValidObjectId } from "mongoose";

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
    
};

export const ProfileCoverImages = {

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

export const deleteAccount = restoreAccount;