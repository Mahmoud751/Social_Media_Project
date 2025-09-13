import type { IDToken, IEmail, IEmailConfirmation, ILogin, ISignup, ISignupEmail } from "./auth.dto";
import type { Types } from "mongoose";
import { type UserDocLean, type UserDoc, type OTPDocLean, Provider } from "../../DB/models/User.model";
import type { Request, Response } from "express";
import { type LoginTicket, type TokenPayload, OAuth2Client } from "google-auth-library";
import { type TokenCredentialType, createLoginCredentials } from "../../utils/security/token.security";
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from "../../utils/response/error.response";
import { UserRepository } from "../../DB/repository/User.repository";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { generateOTPCode, generateOTPObject, ValidateOTPType } from "../../utils/security/otp.security";
import { generateEncryption } from "../../utils/security/crypto.security";
import { emailEvent } from "../../utils/event/email.event";
import { checkOTPStatus, validateOTP } from "../../utils/security/otp.security";

export class AuthenticationService {
    private userModel: UserRepository;

    constructor(userModel: UserRepository) {
        this.userModel = userModel;
    };

    private verifyGoogleAccount = async (idToken: string): Promise<TokenPayload> => {
        const ticket: LoginTicket = await new OAuth2Client().verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_IDS?.split(",") || ""
        })
        return ticket.getPayload() as TokenPayload;
    };

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
        const newUser: UserDoc = await this.userModel.createUser({
            username: name, email, picture,
            confirmEmail: new Date(),
            provider: Provider.google
        });
        return res.status(201).json({ message: "User Signed Up Successfully!", user: newUser });
    };

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

        const credentails: TokenCredentialType = await createLoginCredentials({ _id: user._id as Types.ObjectId });
        return res.json({ message: "User Logged In Successfully!", credentails });
    };

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
            filter: { email: payload.email as string },
            options: { lean: true }
        });

        // If User Already Exists => Login
        if (user) {
            const credentails: TokenCredentialType = await createLoginCredentials({ _id: user._id as Types.ObjectId });
            return res.status(200).json({ message: "User Logged In Successfully!", credentails });
        }

        // If Not => Signup
        const { name, email, picture }: ISignupEmail = payload;
        if (!name || !email || !picture) {
            throw new BadRequestException("Invalid Data!");
        }
        const newUser: UserDoc = await this.userModel.createUser({
            username: name, email, picture,
            confirmEmail: new Date(),
            provider: Provider.google
        });
        return res.status(201).json({ message: "User Signed Up Successfully!", user: newUser });
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
        if (await this.userModel.findOne({ filter: { email: data.email }, select: "email" })) {
            throw new ConflictException("User Already Exists!");
        }
        // Create User
        const otp: string = generateOTPCode();
        const user: UserDoc = await this.userModel.createUser({
            ...data,
            phone: await generateEncryption(data.phone),
            password: await generateHash(data.password),
            confirmOtp: await generateOTPObject(otp)
        });
        // Send Email To Confirm The Account
        if (!user) {
            throw new BadRequestException("Failed To Signup This User!");
        }
        emailEvent.emit("ConfirmEmail", { otp, to: data.email });
        return res.json({ message: "User Signed Up Successfully!", user });
    };

    /**
     * Login
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Response>
     */
    login = async (req: Request, res: Response): Promise<Response> => {
        const { email, password }: ILogin = req.body;
        const user: UserDoc | UserDocLean | null = await this.userModel.findOne({
            filter: { email: email },
            options: { lean: true }
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
        const credentails: TokenCredentialType = await createLoginCredentials({ _id: user._id as Types.ObjectId }, user.role);
        return res.json({ message: "User Logged In Successfully!", credentails });
    };

    /**
     * verifyAccount
     * @param data - IEmailConfirmation
     * @returns Promise<boolean>
     */
    confirmEmail = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp }: IEmailConfirmation = req.body;
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email: email },
            options: { lean: true }
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
                    set: {
                        confirmOtp: user.confirmOtp as OTPDocLean
                    }
                }
            });
            throw isValidated.error;
        }

        await this.userModel.updateUser({
            filter: { _id: user._id },
            updates: {
                set: { confirmEmail: new Date() },
                unset: { confirmOtp: true }
            }
        });
        return res.json({ message: "Email Confirmed Successfully!" });
    };

    resendConfirmEmail = async (req: Request, res: Response): Promise<Response> => {
        const { email }: IEmail = req.body;
        const user: UserDoc | UserDocLean | null = await this.userModel.findUser({
            filter: { email },
            options: { lean: true }
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
        emailEvent.emit("ConfirmEmail", { otp: otpCode, to: user.email });
        await this.userModel.updateUser({
            filter: { email },
            updates: {
                set: {
                    confirmOtp: {
                        count: 0,
                        otp: await generateHash(otpCode),
                        expiredAt: new Date(Date.now() + Number(process.env.OTP_EXPIRE_TIME)),
                        banUntil: undefined
                    }
                },
            }
        });
        return res.json({ message: `OTP Code's Been Sent Successfully to ${email}` })
    };
};