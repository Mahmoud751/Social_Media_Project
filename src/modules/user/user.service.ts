import type { Request, Response } from "express";
import type { UserRepository } from "../../DB/repository/User.repository";
import type { IAuthRequest } from "../../middlewares/authentication.middleware";
import type { IDecoded, ILogout, IProfile, IResetPassword, IUpdate, IUpdatePassword } from "./user.dto";
import type { TokenRepository } from "../../DB/repository/Token.repository";
import { ApplicationException, BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from "../../utils/response/error.response";
import { createLoginCredentials, LogOutEnum } from "../../utils/security/token.security";
import { tokenRepo } from "../../shared/repos.shared";
import { generateDecryption, generateEncryption } from "../../utils/security/crypto.security";
import { Types } from "mongoose";
import { IEmail, IEmailConfirmation } from "../auth/auth.dto";
import { IOTP, OTPDocLean, Provider, UpdateResultType, UserDoc, UserDocLean } from "../../DB/models/User.model";
import { checkOTPStatus, generateOTPCode, generateOTPObject, validateOTP, ValidateOTPType } from "../../utils/security/otp.security";
import { emailEvent } from "../../utils/event/email.event";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { uploadFile } from "../../utils/multer/AWS/s3.service";

export class UserService {
    private userModel: UserRepository;
    private tokenModel: TokenRepository = tokenRepo;

    constructor(userModel: UserRepository) {
        this.userModel = userModel;
    };

    profile = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { user }: IProfile = req; 
        if (!user) {
            throw new NotFoundException("User Does Not Exist!")
        }
        if (user.phone) {
            user.phone = await generateDecryption(user.phone);
        }
        return res.json({ message: "Done", user });
    };

    getNewTokens = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { user }: IProfile = req;
        if (!user) {
            throw new BadRequestException("User Does Not Exist!");
        }
        const credentails = await createLoginCredentials({ _id: user._id as Types.ObjectId }, user.role);
        return res.status(201).json({ message: "New Credentials Created Successfully!", credentails });
    };

    sendForgetPassword = async (req: Request, res: Response): Promise<Response> => {
        const { email }: IEmail = req.body;

        // Find User
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email },
            options: { lean: true }
        });
        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // If Account Not Verified
        if (!user.confirmEmail) {
            throw new UnauthorizedException("Email Not Confirmed Yet!");
        }

        // If Account Was Deleted
        if (user.deletedAt) {
            throw new UnauthorizedException("Account Is Deleted!");
        }

        // If The Provider Wasn't System
        if (user.provider !== Provider.system) {
            throw new BadRequestException("Invalid Provider!");
        }

        // Check If User Blocked From Requesting Another OTP
        const isValid = checkOTPStatus(user.resetPasswordOtp as OTPDocLean);
        if (!isValid.success) {
            throw isValid.error;
        }

        // Send Mail With OTP To Reset The Password
        const otpCode: string = generateOTPCode();
        const otpDoc: IOTP = await generateOTPObject(otpCode);
        await this.userModel.updateUser({
            filter: { email: user.email },
            updates: {
                set: {
                    resetPasswordOtp: otpDoc
                }
            }
        });
        emailEvent.emit("ResetPassword", { otp: otpCode, to: user.email });
        return res.json({ message: `OTP Code's Been Sent Successfully to ${email}` });
    };

    verifyForgetPassword = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp }: IEmailConfirmation = req.body;
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email },
            options: { lean: true }
        });

        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        if (!user.confirmEmail) {
            throw new UnauthorizedException("Email Not Confirmed Yet!");
        }

        if (user.deletedAt) {
            throw new UnauthorizedException("Account Is Deleted!");
        }

        if (user.provider != Provider.system) {
            throw new BadRequestException("Invalid Provider");
        }
        const isValidated: ValidateOTPType = await validateOTP({ otp, userOTP: user.resetPasswordOtp as OTPDocLean });

        if (!isValidated.success) {
            await this.userModel.updateUser({
                filter: { _id: user._id },
                updates: {
                    set: {
                        resetPasswordOtp: user.resetPasswordOtp as OTPDocLean
                    }
                }
            });
            throw isValidated.error;
        }
        return res.json({ message: "OTP Confirmed Successfully!" });
    };

    resetPassword = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp, password }: IResetPassword = req.body;
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email },
            options: { lean: true }
        });

        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        if (!user.confirmEmail) {
            throw new UnauthorizedException("Email Not Confirmed Yet!");
        }

        if (!user.resetPasswordOtp || user.provider !== Provider.system) {
            throw new BadRequestException("Invalid Data!");
        }

        if (user.deletedAt) {
            throw new ForbiddenException("Account Is Deleted!");
        }

        if (!await compareHash(otp, user.resetPasswordOtp.otp)) {
            throw new UnauthorizedException("Invalid OTP!");
        }

        await this.userModel.updateUser({
            filter: { _id: user._id },
            updates: {
                set: {
                    password: await generateHash(password),
                    changeCredentialsTime: new Date()
                },
                unset: {
                    resetPasswordOtp: true
                }
            }
        });
        return res.status(201).json({ message: "Password Has Been Reset Successfully!" });
    };

    updateBasicInfo = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const updates: IUpdate = req.body;
        const { user }: IProfile = req;
        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        if (!Object.keys(updates).length) {
            throw new BadRequestException("Nothing Found To Update!");
        }

        if (updates.phone) {
            updates.phone = await generateEncryption(updates.phone);
        }

        if (updates.username) {
            const [firstName, lastName]: string[] = updates.username.split(" ") || [];
            updates.firstName = firstName as string;
            updates.lastName = lastName as string;
            updates.username = undefined;
        }
        const updated: UpdateResultType = await this.userModel.updateUser({
            filter: { _id: user._id },
            updates: {
                set: { ...updates }
            }
        });

        if (!updated.matchedCount) {
            throw new ApplicationException("Update's Failed");
        }
        return res.status(201).json({ message: "Info Updated Successfully!" });
    };

    updatePassword = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { user, decoded }: IProfile = req;
        const { oldPassword, newPassword, flag }: IUpdatePassword = req.body;

        if (!user || !decoded) {
            throw new NotFoundException("User Does Not Exist!");
        }
        if (!await compareHash(oldPassword, user.password as string)) {
            throw new UnauthorizedException("Invalid Crendentials");
        }

        const password = await generateHash(newPassword);
        switch (flag) {
            case LogOutEnum.signOutFromAll:
                await this.userModel.updateUser({
                    filter: { _id: user._id },
                    updates: {
                        set: {
                            password,
                            changeCredentialsTime: new Date()
                        }
                    }
                });
                break;
            case LogOutEnum.signOut:
                await this.tokenModel.createToken({
                    data: {
                        jti: decoded.jti as string,
                        expiresIn: decoded.iat as number + Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
                        userId: decoded._id
                    }
                });
                break;
            default:
                break;
        }

        if (flag !== LogOutEnum.signOutFromAll) {
            await this.userModel.updateUser({
                filter: { _id: user._id },
                updates: { set: { password } }
            });
        }
        return res.status(201).json({ message: "Password Has Been Updated Successfully!" });
    };

    profileImage = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { decoded }: IDecoded = req;
        const file = req.file;
        if (!file || !decoded) {
            throw new BadRequestException("Invalid Provided Data!");
        }
        const key: string = await uploadFile({
            file,
            path: `users/${decoded._id}`
        });
        return res.json({ message: "Photo Uploaded Successfully!", key });
    };

    logout = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { decoded }: IDecoded = req;
        const { flag }: ILogout = req.body;
        let statusCode = 200;

        switch(flag) {
            case LogOutEnum.signOutFromAll:
                await this.userModel.updateUser({
                    filter: { _id: decoded?._id },
                    updates: {
                        set: {
                            changeCredentialsTime: new Date()
                        }
                    }
                });
                break;
            default:
                await this.tokenModel.createToken({
                    data: {
                        jti: req.decoded?.jti as string,
                        expiresIn: req.decoded?.iat as number + Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
                        userId: req.decoded?._id
                    }
                });
                statusCode = 201;
                break;
        };
        return res.status(statusCode).json({ message: "User Logged Out Successfully!" });
    };
};