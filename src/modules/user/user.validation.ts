import { z } from "zod";
import { generalFields } from "../../middlewares/validation.middleware";
import type { IUpdatePassword } from "./user.dto";

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
