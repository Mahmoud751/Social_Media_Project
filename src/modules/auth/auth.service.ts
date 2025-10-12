import type {
    IDToken,
    IEmail,
    IEmailConfirmation,
    ILogin,
    ISignup,
    ISignupEmail
} from "./auth.dto";
import {
    BadRequestException,
    ConflictException,
    NotFoundException,
    UnauthorizedException
} from "../../utils/response/error.response";
import {
    generateOTPCode,
    generateOTPObject,
    ValidateOTPType
} from "../../utils/security/otp.security";
import {
    type LoginTicket,
    type TokenPayload,
    OAuth2Client
} from "google-auth-library";
import {
    type TokenCredentialType,
    createLoginCredentials
} from "../../utils/security/token.security";
import { compareHash } from "../../utils/security/hash.security";
import type { Types } from "mongoose";
import type { Request, Response } from "express";
import type { OTPDocLean, UserDoc, UserDocLean } from "../../utils/types/mongoose.types";
import type { UserRepository } from "../../DB/repository/user.repository";
import type { ILoginResponse, ISignupResponse } from "./auth.entities";
import { Provider } from "../../DB/models/user.model";
import { checkOTPStatus, validateOTP } from "../../utils/security/otp.security";
import { successResponse } from "../../utils/response/sucess.response";
import emailEvent from "../../utils/event/email.event";

export class AuthenticationService {
    private userModel: UserRepository;

    constructor(userModel: UserRepository) {
        this.userModel = userModel;
    };

    /**
     * verifyGoogleAccount
     * @param idToken - string
     * @returns Promise<TokenPayload>
     */
    private verifyGoogleAccount = async (idToken: string): Promise<TokenPayload> => {
        const ticket: LoginTicket = await new OAuth2Client().verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_IDS?.split(",") || ""
        })
        return ticket.getPayload() as TokenPayload;
    };

    /**
     * signupWithGmail
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    signupWithGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: IDToken = req.body;
        if (!idToken || typeof idToken !== 'string') {
            throw new BadRequestException("Invalid Id Token");
        }
        const payload: TokenPayload = await this.verifyGoogleAccount(idToken);
        if (!payload || !payload.email_verified) {
            throw new UnauthorizedException("Not Verified Account")
        }
        const { name, email, picture }: ISignupEmail = payload;
        if (!name || !email || !picture) {
            throw new BadRequestException("Invalid Data!");
        }
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email },
            options: { lean: true }
        });
        if (user) {
            throw new ConflictException("User Already Exists!");
        }
        const newUser: UserDoc | undefined = await this.userModel.createUser({
            username: name, email, profilePicture: picture,
            confirmEmail: new Date(),
            provider: Provider.google
        });
        if (!newUser) {
            throw new BadRequestException("Failed To Sign Up That User!");
        }
        return successResponse<ISignupResponse>(res, {
            message: "User Signed Up Successfully!",
            statusCode: 201,
            data: { user: newUser }
        });
    };

    /**
     * loginWithGmail
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    loginWithGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: IDToken = req.body;
        if (!idToken || typeof idToken !== 'string') {
            throw new BadRequestException("Invalid Id Token!");
        }
        // If Account Not Confirmed
        const payload: TokenPayload = await this.verifyGoogleAccount(idToken);
        if (!payload || !payload.email_verified) {
            throw new UnauthorizedException("Not Verified Account!");
        }

        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email: payload.email as string },
            options: { lean: true }
        });
        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
        }
        const credentials: TokenCredentialType = await createLoginCredentials({ _id: user._id as Types.ObjectId });
        return successResponse<ILoginResponse>(res, {
            message: "User Logged In Successfully!",
            data: {
                credentials
            }
        });
    };

    /**
     * signWithGmail
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    signWithGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: IDToken = req.body;
        if (!idToken || typeof idToken !== 'string') {
            throw new BadRequestException("Invalid Id Token");
        }

        // If Email Not Confirmed
        const payload: TokenPayload = await this.verifyGoogleAccount(idToken);
        if (!payload || !payload.email_verified) {
            throw new UnauthorizedException("Not Verified Account!");
        }
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email: payload.email as string }
        });

        // If User Already Exists => Login
        if (user) {
            const credentials: TokenCredentialType = await createLoginCredentials({ _id: user._id as Types.ObjectId });
            return successResponse<ILoginResponse>(res, {
                message: "User Logged In Successfully!",
                data: {
                    credentials
                }
            });
        }

        // If Not => Signup
        const { name, email, picture }: ISignupEmail = payload;
        if (!name || !email || !picture) {
            throw new BadRequestException("Invalid Data!");
        }
        const newUser: UserDoc | undefined = await this.userModel.createUser({
            username: name, email, profilePicture: picture,
            confirmEmail: new Date(),
            provider: Provider.google
        });

        if (!newUser) {
            throw new BadRequestException("Failed To Sign Up That User!");
        }
        return successResponse<ISignupResponse>(res, {
            message: "User Signed Up Successfully!",
            statusCode: 201,
            data: { user: newUser }
        });
    };

    /**
     * Sign Up
     * @param req - Express.Request 
     * @param res - Express.Response
     * @returns Promise<Response>
     */
    signup = async (req: Request, res: Response): Promise<Response> => {
        const data: ISignup = req.body;
        // Checking User In System Then Creating It
        if (await this.userModel.findUser({ filter: { email: data.email }, select: "email" })) {
            throw new ConflictException("User Already Exists!");
        }
        // Create User
        const otp: string = generateOTPCode();
        const user: UserDoc | undefined = await this.userModel.createUser({
            ...data,
            phone: data.phone,
            password: data.password,
            confirmOtp: await generateOTPObject(otp)
        });
        // Send Email To Confirm The Account
        if (!user) {
            throw new BadRequestException("Failed To Signup This User!");
        }
        emailEvent.emit("send-confirmation-email", { otp, to: data.email });
        return successResponse<ISignupResponse>(res, {
            message: "User Signed Up Successfully!",
            statusCode: 201,
            data: { user }
        });
    };

    /**
     * Login
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Response>
     */
    login = async (req: Request, res: Response): Promise<Response> => {
        const { email, password }: ILogin = req.body;
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email }
        });
        if (!user) {
            throw new UnauthorizedException("Invalid Email Or Password!");
        }
        if (!user.confirmEmail) {
            throw new UnauthorizedException("Email Not Confirmed!");
        }
        if (!await compareHash(password, user.password)) {
            throw new UnauthorizedException("Invalid Email Or Password!");
        }
        if (user.twoSV) {
            const otp: string = generateOTPCode();
            await this.userModel.updateUser({
                filter: { _id: user._id },
                updates: {
                    $set: {
                        two_step_verification: await generateOTPObject(otp)
                    }
                }
            });
            emailEvent.emit("login-with-otp", { otp, to: user.email });
            return successResponse(res, { message: "Check Your Email To Login With OTP" });
        }

        const credentials: TokenCredentialType = await createLoginCredentials(
            { _id: user._id as Types.ObjectId },
            user.role
        );
        return successResponse<ILoginResponse>(res, {
            message: "User Logged In Successfully!",
            data: { credentials }
        });
    };

    twoSVLoginConfirmation = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp }: { email?: string, otp?: string } = req.body;

        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email }
        });
        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
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

        // Remove OTP Object
        await this.userModel.updateUser({
            filter: { _id: user._id },
            updates: {
                $unset: {
                    two_step_verification: 1
                }
            }
        });

        // Create Login Crendetials
        const credentials: TokenCredentialType = await createLoginCredentials({ _id: user._id }, user.role);
        return successResponse<ILoginResponse>(res, {
            message: "Logging Confirmed Successfully!",
            data: { credentials }
        });
    };

    /**
     * confirmEmail
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    confirmEmail = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp }: IEmailConfirmation = req.body;
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email: email }
        });
        if (!user) {
            throw new NotFoundException("User Does Not Exist!");
        }

        // Check If Email Already Confirmed
        if (user.confirmEmail) {
            throw new BadRequestException("Email Already Confirmed!");
        }

        // Validate OTP (Invalid Or Expired, Maximum Attemps Reached, Banned)
        const isValidated: ValidateOTPType = await validateOTP({
            otp: otp,
            userOTP: user.confirmOtp as OTPDocLean,
        });

        if (!isValidated.success) {
            await this.userModel.updateUser({
                filter: { _id: user._id },
                updates: {
                    $set: {
                        confirmOtp: user.confirmOtp as OTPDocLean
                    }
                }
            });
            throw isValidated.error;
        }

        await this.userModel.updateUser({
            filter: { _id: user._id },
            updates: {
                $set: { confirmEmail: new Date() },
                $unset: { confirmOtp: 1 }
            }
        });
        return successResponse(res, { message: "Email Confirmed Successfully!" });
    };

    /**
     * resendConfirmEmail
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Respone>
     */
    resendConfirmEmail = async (req: Request, res: Response): Promise<Response> => {
        const { email }: IEmail = req.body;
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email }
        });
        if (!user) {
            throw new BadRequestException("User Does Not Exist!");
        }

        // Check If Email Already Confirmed
        if (user.confirmEmail || !user.confirmOtp) {
            throw new BadRequestException("Email Already Confirmed!");
        }

        // Check If User Exceeded Maximum Attemps
        const isValid = checkOTPStatus(user.confirmOtp as OTPDocLean);
        if (!isValid.success) {
            throw isValid.error;
        }

        // Send Mail With OTP to Verify The Account
        const otpCode: string = generateOTPCode();
        emailEvent.emit("send-confirmation-email", { otp: otpCode, to: user.email });
        await this.userModel.updateUser({
            filter: { email },
            updates: {
                $set: {
                    confirmOtp: generateOTPObject(otpCode)
                }
            }
        });
        return successResponse(res, { message: `OTP Code's Been Sent Successfully to ${email}` });
    };
};