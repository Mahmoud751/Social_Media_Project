import { z } from 'zod';
import { generalFields } from '../../middlewares/validation.middleware';

export const login = {
    body: z.strictObject({
        email: generalFields.email,
        password: generalFields.password
    })
};

export const signup = {
    body: login.body.extend({
        username: generalFields.username,
        phone: generalFields.phone,
        gender: generalFields.gender,
        age: generalFields.age,
    }).superRefine((data, ctx) => {
        if (data.username?.split(" ")?.length < 2) {
            ctx.addIssue({
                code: "custom",
                path: ["username"],
                message: "Username Must Be At Least 2 Parts",
            });
        }
    })
};

export const resendConfirmEmail = {
    body: z.strictObject({
        email: generalFields.email
    }),
};

export const confirmEmail = {
    body: resendConfirmEmail.body.extend({
        otp: generalFields.otp
    })
};
