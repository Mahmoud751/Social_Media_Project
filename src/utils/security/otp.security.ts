import type { IOTP } from "../../DB/models/User.model";
import type { OTPDoc, OTPDocLean } from "../types/mongoose.types";
import { generateHash } from "./hash.security";
import { BadRequestException } from "../response/error.response";
import { compareHash } from "./hash.security";

export interface ValidateOTPType {
    success: boolean;
    error: BadRequestException | null
};

export interface confirmOTPFilterType {
    confirmEmail: {
        $exists: boolean
    },
    confirmOtp: {
        $exists: boolean
    }
};

export enum OTPType {
    confirmOTP = "Confirm_OTP",
    passwordOTP = "Password_OTP"
};

export const OTPFilter = {
    confirmEmail: { $exists: false },
    confirmOtp: { $exists: true }
};

export const generateOTPCode = (): string => {
    return String(Math.floor(Math.random() * 900000) + 100000);
};

export const generateOTPObject = async (otp: string): Promise<IOTP> => {
    return {
        otp: await generateHash(otp),
        count: 0,
        expiredAt: new Date(Date.now() + Number(process.env.OTP_EXPIRE_TIME))
    };
};

export const validateOTP = async ({
    otp,
    userOTP
}: {
    otp: string,
    userOTP: OTPDoc | OTPDocLean | IOTP
}): Promise<ValidateOTPType> => {
    // Check If User Is Banned
    const now = Date.now();
    if (userOTP?.banUntil) {
        const banUntil = userOTP.banUntil.getTime();
        const remainingTime: number = (banUntil - now) / 1000;
        if (banUntil > now) {
            return {
                success: false,
                error: new BadRequestException(
                    `You are Temporary Banned, Wait for ${remainingTime.toFixed()} Seconds To Get Another OTP`
                )
            };
        }
        userOTP.banUntil = undefined;
    }

    // Check If Maximum Attemps Reached
    if (userOTP.count >= Number(process.env.OTP_COUNT)) {
        userOTP.count = 1,
        userOTP.banUntil = new Date(now + Number(process.env.OTP_BAN_TIME));
        return {
            success: false,
            error: new BadRequestException("Too Many Attemps Failed!")
        };
    }

    // Check If OTP Invalid Or Expired
    if (userOTP.expiredAt.getTime() < now || !await compareHash(otp, userOTP.otp)) {
        userOTP.banUntil = undefined,
        userOTP.count = userOTP.count + 1;
        return {
            success: false,
            error: new BadRequestException("Invalid Or Expired OTP")
        };
    }
    return { success: true, error: null };
};

export const checkOTPStatus = (otpDoc: OTPDoc | OTPDocLean | IOTP): ValidateOTPType => {
    // Check If User Is Banned
    const now = Date.now();
    if (otpDoc?.banUntil) {
        const banUntil = otpDoc.banUntil.getTime();
        if (banUntil > now) {
            const remainingTime = (otpDoc.banUntil.getTime() - now) / 1000;
            return {
                success: false,
                error: new BadRequestException(
                    `You are Temporary Banned, Wait for ${remainingTime.toFixed()} Seconds To Get Another OTP`
                )
            };
        }
    }
    return { success: true, error: null };
};