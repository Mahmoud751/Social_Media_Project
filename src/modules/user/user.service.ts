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
    FriendRequestDoc,
    FriendRequestDocLean,
    IDType,
    OTPDocLean,
    PostDoc,
    PostDocLean,
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
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException
} from "../../utils/response/error.response";
import {
    createLoginCredentials,
    generateToken,
    getAllowedRules,
    LogOutEnum,
    verifyToken
} from "../../utils/security/token.security";
import type { Request, Response } from "express";
import type { IAuthRequest } from "../../utils/types/Express.types";
import type { UserRepository } from "../../DB/repository/user.repository";
import type { TokenRepository } from "../../DB/repository/token.repository";
import type { IEmail, IEmailConfirmation } from "../auth/auth.dto";
import type { Types } from "mongoose";
import type { JwtPayload } from "jsonwebtoken";
import type { FriendRequestRepository } from "../../DB/repository/friendRequest.repository";
import type { PostRepository } from "../../DB/repository/post.repository";
import { Provider, Role } from "../../DB/models/user.model";
import { v4 as uuid } from 'uuid';
import { tokenRepo } from "../../shared/repos.shared";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { generateDecryption, generateEncryption } from "../../utils/security/crypto.security";
import { successResponse } from "../../utils/response/sucess.response";
import { StatusEnum } from "../../DB/models/friendRequest.model";
import emailEvent from "../../utils/event/email.event";
import userEvent from "./user.listener";

export class UserService {
    private userModel: UserRepository;
    private postModel: PostRepository;
    private friendRequestModel: FriendRequestRepository;
    private tokenModel: TokenRepository = tokenRepo;

    constructor(userModel: UserRepository, postModel: PostRepository, friendReqeustModel: FriendRequestRepository) {
        this.userModel = userModel;
        this.postModel = postModel;
        this.friendRequestModel = friendReqeustModel;
    };

    /**
     * profile
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    profile = async (req: IAuthRequest, res: Response): Promise<Response> => {
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        const user = await this.userModel.findUser({
            filter: { _id: req.user._id },
            options: {
                populate: {
                    path: "friends",
                    select: "firstName lastName email gender picture"
                }
            }
        });
        if (!user) {
            throw new NotFoundException("User Does Not Exist!")
        }
        if (user.phone) {
            user.phone = await generateDecryption(user.phone);
        }
        return successResponse<IProfileResponse>(res, { data: { user } });
    };

    /**
     * dashboard
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    dashboard = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const result: [(UserDoc[] | UserDocLean[]), (PostDoc[] | PostDocLean[])] = await Promise.all([
            this.userModel.findUsers({}),
            this.postModel.findPosts({})
        ]);
        return successResponse(res, { data: { result } });
    };

    /**
     * changeRole
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    changeRole = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { userId }: { userId?: string } = req.params;
        const { role }: { role: string } = req.body;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        if (role === Role.super_admin) {
            throw new BadRequestException("Role Is Not Allowed!");
        }

        const user: UserDoc | UserDocLean | null = await this.userModel.findUserAndUpdate({
            filter: {
                _id: userId,
                role: getAllowedRules(req.user.role, role as Role)
            },
            updates: { $set: { role } }
        });
        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        return successResponse(res, { data: { user } });
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
     * sendFriendRequest
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    sendFriendRequest = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { userId }: { userId?: string } = req.params;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        // Sender Cannot Be Receiver
        if (req.user._id.toString() === userId) {
            throw new BadRequestException("You Cannot Send Friend Request To Yourself!");
        }

        // Find Sent To User And Ensure it's not already a friend
        const id: IDType = this.userModel.createId(userId as string);
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: {
                _id: id,
                friends: { $ne: req.user._id }
            }
        });
        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // Check if there is already a Friend Request
        const friendRequest: FriendRequestDoc | FriendRequestDocLean | null = await this.friendRequestModel.findFriendRequest({
            filter: {
                senderReceiverKey: this.friendRequestModel.getCompounIndex(userId as string, req.user._id.toString())
            }
        });
        if (friendRequest) {
            throw new ConflictException("Friend Request Already Exists!");
        }

        // Create Friend Request
        const newFriendRequest: FriendRequestDoc | undefined = await this.friendRequestModel.createFriendRequest({
            sender: req.user._id,
            receiver: id,
        });
        if (!newFriendRequest) {
            throw new ApplicationException("Failed To Send Friend Request!");
        }
        return successResponse(res, {
            message: "Friend Request's been Sent Successfully!",
            statusCode: 201,
            data: { friendRequest: newFriendRequest }
        });
    };

    /**
     * friendRequestAction
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    friendRequestAction = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { requestId }: { requestId?: string } = req.params;
        const { status }: { status: string } = req.body;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // Accept The Friend If Conditions Matched
        const friendRequest: FriendRequestDoc | FriendRequestDocLean | null = await this.friendRequestModel.findFriendRequestAndUpdate({
            filter: {
                _id: this.userModel.createId(requestId as string),
                receiver: req.user._id,
                status: StatusEnum.pending
            },
            updates: {
                $set: { status }
            }
        });
        if (!friendRequest) {
            throw new NotFoundException("Friend Request Does Not Exist!");
        }

        // If Friend Request Accepted
        if (status === StatusEnum.accepted) {
            await Promise.all([
                this.userModel.updateUser({
                    filter: { _id: friendRequest.receiver },
                    updates: { $addToSet: { friends: friendRequest.sender } }
                }),
                this.userModel.updateUser({
                    filter: { _id: friendRequest.sender },
                    updates: { $addToSet: { friends: friendRequest.receiver } }
                })
            ]);
        }
        return successResponse(res, {
            message: `Friend Request ${status} Successfully!`,
            data: { friendRequest }
        });
    };

    /**
     * cancelFriendRequest
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    cancelFriendRequest = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { requestId }: { requestId?: string } = req.params;
        if (!req.user) {
            throw new BadRequestException("User Does Not Exist!");
        }
        const friendRequet: DeleteResultType = await this.friendRequestModel.deleteFriendRequest({
            filter: {
                _id: requestId,
                sender: req.user._id
            }
        });
        if (!friendRequet.deletedCount) {
            throw new NotFoundException("Friend Request Does Not Exist!");
        }
        return successResponse(res, { message: 'Friend Request Cancelled Successfully!' });
    };

    removeFriend = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { userId }: { userId?: string } = req.params;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        if (req.user._id.toString() === userId) {
            throw new BadRequestException("You Cannot Remove Yourself!");
        }

        if (!await this.userModel.removeFriendship(req.user._id.toString(), userId as string)) {
            throw new NotFoundException("This Friend Does Not Exist!");
        }
        return successResponse(res, { message: "Friend Remove Successfully!" });
    };

    blockUser = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { userId }: { userId?: string } = req.params;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        const id: IDType = this.userModel.createId(userId as string);
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { _id: id }
        });
        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        const updated: UpdateResultType = await this.userModel.updateUser({
            filter: {
                _id: req.user._id,
                blockedUsers: { $ne: id }
            },
            updates: {
                $addToSet: { blockedUsers: id }
            }
        });

        if (!updated.matchedCount) {
            throw new ConflictException("User Already Blocked!");
        }
        return successResponse(res, { message: "Friend's Blocked Successfully!" });
    };

    revokeBlock = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { userId }: { userId?: string } = req.params;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        const id: IDType = this.userModel.createId(userId as string);
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { _id: id }
        });

        if (!user) {
            throw new NotFoundException("User Does Not");
        }
        const updated: UpdateResultType = await this.userModel.updateUser({
            filter: {
                _id: req.user._id,
                blockedUsers: id
            },
            updates: {
                $pull: { blockedUsers: id }
            }
        });

        if (!updated.modifiedCount) {
            throw new NotFoundException("This User Is Not In Your Blocked List!");
        }
        return successResponse(res, { message: "User Unblocked Successfully!" });
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
        await this.userModel.updateUser({
            filter: { email: user.email },
            updates: {
                $set: {
                    resetPasswordOtp: await generateOTPObject(otpCode)
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
                    $set: {
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

        if (!await compareHash(otp, user.resetPasswordOtp.otp)) {
            throw new UnauthorizedException("Invalid OTP!");
        }

        await this.userModel.updateUser({
            filter: { _id: user._id },
            updates: {
                $set: {
                    password: await generateHash(password),
                    changeCredentialsTime: new Date()
                },
                $unset: {
                    resetPasswordOtp: 1
                }
            }
        });
        return successResponse(res, {
            message: "Password Has Been Reset Successfully!",
            statusCode: 201
        });
    };

    enable2SV = async (req: IAuthRequest, res: Response): Promise<Response> => {
        if (req.user?.twoSV) {
            throw new BadRequestException("Two Step Verification Already Enabled!");
        }
        const otp: string = generateOTPCode();
        await this.userModel.updateUser({
            filter: { _id: req.user?._id },
            updates: {
                $set: {
                    two_step_verification: await generateOTPObject(otp)
                }
            }
        });
        emailEvent.emit("enable-2SV", { otp, to: req.user?.email });
        return successResponse(res, { message: "Check Your Email To Activate Two Step Verification!" });
    };

    verify2SV = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { user }: { user?: UserDoc | UserDocLean } = req;
        const { otp }: { otp: string } = req.body;
        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        if (!user.two_step_verification) {
            throw new BadRequestException("Choose Enabling 2SV Then Verifying!");
        }
        const isValidated: ValidateOTPType = await validateOTP({
            otp: otp as string,
            userOTP: user.two_step_verification as OTPDocLean
        });

        if (!isValidated.success) {
            await this.userModel.updateUser({
                filter: { _id: user._id },
                updates: {
                    $set: {
                        two_step_verification: user.two_step_verification
                    }
                }
            });
            throw isValidated.error;
        }

        // Remove OTP Object and Enalb 2-SV
        await this.userModel.updateUser({
            filter: { _id: user._id },
            updates: {
                $set: { twoSV: true },
                $unset: { two_step_verification: 1 }
            }
        });
        return successResponse(res, { message: "Two Step Verification Activated Successfully!" });
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
                $set: { ...updates }
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
                        $set: {
                            password,
                            changeCredentialsTime: new Date()
                        }
                    }
                });
                break;
            case LogOutEnum.signOut:
                await this.tokenModel.createToken({
                    jti: decoded.jti as string,
                    expiresIn: decoded.iat as number + Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
                    userId: decoded._id
                });
                break;
            default:
                break;
        }

        if (flag !== LogOutEnum.signOutFromAll) {
            await this.userModel.updateUser({
                filter: { _id: user._id },
                updates: { $set: { password } }
            });
        }
        return successResponse(res, {
            message: "Password Has Been Updated Successfully!",
            statusCode: 201
        });
    };

    /**
     * requestEmailChange
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    requestEmailChange = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const { newEmail }: { newEmail?: string } = req.body;
        if (!req.user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        if (newEmail === req.user.email) {
            throw new ConflictException("Email Already Been Set On That Account!");
        }

        // Check If New Email Does Not Exist Before
        const existedUser: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email: newEmail }
        });
        if (existedUser) {
            throw new ConflictException("Email Already Exists!");
        }

        const token: string = await generateToken(
            {
                _id: req.user._id,
                email: newEmail
            },
            process.env.RANDOM_TOKEN_SIGNATURE,
            {
                jwtid: uuid(),
                expiresIn: 10 * 60
            }
        );

        const user: UpdateResultType = await this.userModel.updateUser({
            filter: { _id: req.user._id },
            updates: {
                $set: { tempEmail: newEmail }
            }
        })
        if (!user) {
            throw new NotFoundException("Failed To Update User!");
        }

        emailEvent.emit("update-email", {
            to: newEmail,
            link: `${process.env.APP_URL}/user/verify-email-change/?token=${encodeURIComponent(token)}`
        });
        return successResponse(res, { message: "Check Your Inbox To Verify Your New Email!" });
    };

    /**
     * verifyNewEmail
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    verifyNewEmail = async (req: IAuthRequest, res: Response): Promise<Response> => {
        const token: string = String(req.query.token || "");
        if (!token) {
            throw new BadRequestException("No Token Provided!");
        }

        // Check If Token Provided
        if (!token) {
            throw new BadRequestException("No Token Provided!");
        }
        const decoded: JwtPayload = await verifyToken(
            token,
            process.env.RANDOM_TOKEN_SIGNATURE as string
        );

        // If Token Does Not Contain Info
        if (!decoded || !decoded._id) {
            throw new UnauthorizedException("Invalid Or Expired Token!");
        }

        // Check If Token Is Not Expired
        if (await this.tokenModel.isExpiredToken(decoded)) {
            throw new UnauthorizedException("Un-Authorized Access!");
        }

        // Check If User Exist
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: {
                _id: decoded._id,
                email: { $ne: decoded.email }
            }
        });
        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // If No Pending Email Update Or If Token Contains Wrong Email
        if (!user.tempEmail || user.tempEmail !== decoded.email) {
            throw new BadRequestException("No Pending Email To Update!");
        }

        // Set The New Email
        const updated: UpdateResultType = await this.userModel.updateUser({
            filter: { _id: decoded._id },
            updates: {
                $set: { email: decoded.email },
                $unset: { tempEmail: 1 }
            }
        });
        if (!updated.matchedCount) {
            throw new NotFoundException("Failed To Update User!");
        }

        // Store A Token In DB as Expired (Prevent Editional Verifying)
        await this.tokenModel.createToken({
            jti: decoded.jti as string,
            expiresIn: Date.now() + (10 * 60 * 1000),
            userId: user._id
        });

        // Send Emails To Both Old And New Email
        emailEvent.emit("notify-email-update", { newEmaiL: decoded.email,  oldEmaiL: user.email });
        return successResponse(res, { message: "New Email's been Set Successfully!" });
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
                $set: { picture: key },
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
                $set: { coverPictures: keys }
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
                $set: {
                    changeCredentialsTime: new Date(),
                    freezedAt: new Date(),
                    freezedBy: user._id
                },
                unset: {
                    restoredAt: 1,
                    restoredBy: 1
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
                $set: {
                    restoredAt: new Date(),
                    restoredBy: userId as IDType
                },
                unset: {
                    freezedAt: 1,
                    freezedBy: 1
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
        const { userId }: { userId?: string } = req.params;
        const { user }: { user?: UserDoc | UserDocLean } = req;

        if (!user || user.role !== Role.admin) {
            throw new ForbiddenException("Un-Authorized Account!");
        }

        const deleted: DeleteResultType = await this.userModel.deleteUser({
            filter: {
                _id: this.userModel.createId(userId as string),
                freezedAt: { $exists: true }
            }
        });
        if (!deleted.deletedCount) {
            throw new BadRequestException("User Does Not Exist Or Failed To Permenantly Delete The Account!");
        }
        return successResponse(res, { message: "Account Deleted Permenantly!" });
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

        switch (flag) {
            case LogOutEnum.signOutFromAll:
                await this.userModel.updateUser({
                    filter: { _id: decoded?._id },
                    updates: {
                        $set: {
                            changeCredentialsTime: new Date()
                        }
                    }
                });
                break;
            default:
                await this.tokenModel.createToken({
                    jti: req.decoded?.jti as string,
                    expiresIn: req.decoded?.iat as number + Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
                    userId: req.decoded?._id
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