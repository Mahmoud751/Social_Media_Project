import type {
    IDecoded,
    ILogout,
    IProfile,
    IProfileImage,
    IResetPassword,
    IUpdate,
    IUpdatePassword,
    IUserId
} from "./user.dto";
import type {
    DeleteResultType,
    IDType,
    OTPDocLean,
    UpdateResultType,
    UserDoc,
    UserDocLean
} from "../../utils/types/mongoose.types";
import type {
    ICrendentialsResponse,
    IProfileCoverImageResponse,
    IProfileImageResponse,
    IProfileResponse
} from "./user.entities";
import {
    createUploadPresignedLink,
    deleteDirectoryByPrefix,
    deleteFiles, uploadFiles,
    UploadPresignedPayloadType
} from "../../utils/multer/AWS/s3.service";
import {
    checkOTPStatus,
    generateOTPCode,
    generateOTPObject,
    validateOTP, 
    ValidateOTPType
} from "../../utils/security/otp.security";
import {
    ApplicationException,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException
} from "../../utils/response/error.response";
import type { Request, Response } from "express";
import type { IAuthRequest } from "../../utils/types/Express.types";
import type { UserRepository } from "../../DB/repository/User.repository";
import type { TokenRepository } from "../../DB/repository/Token.repository";
import { type IOTP, Provider, Role } from "../../DB/models/User.model";
import { Types } from "mongoose";
import { tokenRepo } from "../../shared/repos.shared";
import { IEmail, IEmailConfirmation } from "../auth/auth.dto";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { createLoginCredentials, LogOutEnum } from "../../utils/security/token.security";
import { generateDecryption, generateEncryption } from "../../utils/security/crypto.security";
import { successResponse } from "../../utils/response/sucess.response";
import emailEvent from "../../utils/event/email.event";
import userEvent from "./user.listener";

export class UserService {
    private userModel: UserRepository;
    private tokenModel: TokenRepository = tokenRepo;

    constructor(userModel: UserRepository) {
        this.userModel = userModel;
    };

    /**
     * profile
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    profile = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { user }: IProfile = req; 
        if (!user) {
            throw new NotFoundException("User Does Not Exist!")
        }
        if (user.phone) {
            user.phone = await generateDecryption(user.phone);
        }
        return successResponse<IProfileResponse>(res, { data: { user } });
    };

    /**
     * getNewTokens
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    getNewTokens = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { user }: IProfile = req;
        if (!user) {
            throw new BadRequestException("User Does Not Exist!");
        }
        const credentials = await createLoginCredentials({ _id: user._id as Types.ObjectId }, user.role);
        return successResponse<ICrendentialsResponse>(res, {
            message: "New Credentials Created Successfully!",
            statusCode: 201,
            data: { credentials }
        });
    };

    /**
     * sendForgetPassword
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
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
        if (user.freezedAt) {
            throw new UnauthorizedException("Account Is Freezed Or Deleted!");
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
        emailEvent.emit("reset-password-email", { otp: otpCode, to: user.email });
        return successResponse(res, { message: `OTP Code's Been Sent Successfully to ${email}` });
    };

    /**
     * verifyForgetPassword
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
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

        if (user.freezedAt) {
            throw new UnauthorizedException("Account Is Freezed Or Deleted!");
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
        return successResponse(res, { message: "OTP Confirmed Successfully!" });
    };

    /**
     * resetPassword
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
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

        if (user.freezedAt) {
            throw new ForbiddenException("Account Is Freezed Or Deleted!");
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
        return successResponse(res, {
            message: "Password Has Been Reset Successfully!",
            statusCode: 201
        });
    };

    /**
     * updateBasicInfo
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
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
        return successResponse(res, {
            message: "Info Updated Successfully!",
            statusCode: 201
        });
    };

    /**
     * updatePassword
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    updatePassword = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { user, decoded }: IProfile = req;
        const { oldPassword, newPassword, flag }: IUpdatePassword = req.body;

        if (!user || !decoded) {
            throw new NotFoundException("User Does Not Exist!");
        }

        if (oldPassword === newPassword) {
            throw new BadRequestException("Old Password Cannot Be Equal To The New Password!");
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
        return successResponse(res, {
            message: "Password Has Been Updated Successfully!",
            statusCode: 201
        });
    };

    /**
     * profileImage
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    profileImage = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { decoded }: IDecoded = req;
        const { originalname, ContentType }: IProfileImage = req.body;
        if (!originalname || !ContentType || !decoded) {
            throw new BadRequestException("Invalid Provided Data!");
        }
        const { key, url }: UploadPresignedPayloadType = await createUploadPresignedLink({
            originalname,
            ContentType,
            path: `users/${decoded._id}`,
            expiresIn: 300
        });
        const user: UserDoc | UserDocLean | null = await this.userModel.findUserAndUpdate({
            filter: { _id: decoded._id },
            updates: {
                set: { picture: key },
            },
        });
        if (!user) {
            throw new BadRequestException("Failed To Update Profile Image!");
        }
        userEvent.emit("track-profile-photo-upload", {
            userId: decoded._id,
            oldKey: req.user?.picture as string,
            key,
            expiresIn: 50000
        });
        return successResponse<IProfileImageResponse>(res, {
            message: "Photo Updated Successfully!",
            data: { key, url }
        });
    };

    /**
     * profileCoverImages
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    profileCoverImages = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { decoded }: IDecoded = req;
        const files = req.files;
        if (!files || !files.length || !decoded) {
            throw new BadRequestException("Invalid Provided Data!");
        }
        const keys: string[] = await uploadFiles({
            path: `users/${decoded._id}/cover`,
            files: files as Express.Multer.File[]
        });

        const user: UserDoc | UserDocLean | null = await this.userModel.findUserAndUpdate({
            filter: { _id: decoded._id },
            updates: {
                set: { coverPictures: keys}
            }
        });

        if (!user) {
            throw new BadRequestException("Failed To Update The Cover Pictures!");
        }
        if (req.user && req.user.coverPictures) {
            await deleteFiles(req.user.coverPictures);
        }
        return successResponse<IProfileCoverImageResponse>(res, {
            message: "Cover Photos Updated Successfully!",
            data: { keys }
        });
    };

    /**
     * freezeAccount
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    freezeAccount = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { user }: { user?: UserDoc | UserDocLean } = req;
        const { userId }: IUserId = req.params;
        if (!user || (userId && user.role !== Role.admin)) {
            throw new ForbiddenException("Un-Authorized User!");
        }

        const updated: UpdateResultType = await this.userModel.updateUser({
            filter: {
                _id: userId || user._id,
                freezedAt: { $exists: false }
            },
            updates: {
                set: {
                    changeCredentialsTime: new Date(),
                    freezedAt: new Date(),
                    freezedBy: user._id
                },
                unset: {
                    restoredAt: true,
                    restoredBy: true
                }
            }
        });

        if (!updated.matchedCount) {
            throw new NotFoundException("User Does Not Exist Or Failed To Delete The Account!");
        }
        return successResponse(res, { message: "Account Freezed Successfully!" });
    };

    /**
     * restoreAccount
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    restoreAccount = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { user }: { user?: UserDoc | UserDocLean } = req;
        const { userId }: IUserId = req.params;

        if (!user || user.role !== Role.admin) {
            throw new ForbiddenException("Un-Authorized Account!");
        }
        const updated: UpdateResultType = await this.userModel.updateUser({
            filter: {
                _id: userId,
                restoredAt: { $exists: false },
                freezedBy: { $ne: userId }
            },
            updates: {
                set: {
                    restoredAt: new Date(),
                    restoredBy: userId as IDType
                },
                unset: {
                    freezedAt: true,
                    freezedBy: true
                }
            }
        });
        if (!updated.matchedCount) {
            throw new BadRequestException("User Does Not Exist Or Failed To Retrieve The Account!");
        }
        return successResponse(res, { message: "Account Restored Successfully!" });
    };

    /**
     * deleteAccount
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    deleteAccount = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { userId }: IUserId = req.params;
        const { user }: { user?: UserDoc | UserDocLean } = req;

        if (!user || user.role !== Role.admin) {
            throw new ForbiddenException("Un-Authorized Account!");
        }

        const deleted: DeleteResultType = await this.userModel.deleteUser({
            filter: {
                _id: userId,
                freezedAt: { $exists: true }
            }
        });
        if (!deleted.deletedCount) {
            throw new BadRequestException("User Does Not Exist Or Failed To Permenantly Delete The Account!");
        }
        await deleteDirectoryByPrefix(`users/${userId}`);
        return successResponse(res, { message: "Account's Deleted Permenantly!" });
    };

    /**
     * logout
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
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
        return successResponse(res, {
            message: "User Logged Out Successfully!",
            statusCode
        });
    };
};