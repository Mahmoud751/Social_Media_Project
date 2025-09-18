import type {
    JwtPayload,
    SignOptions
} from 'jsonwebtoken';
import type { UserDocLean } from '../types/mongoose.types';
import {
    BadRequestException,
    UnauthorizedException
} from '../response/error.response';
import { sign, verify } from 'jsonwebtoken';
import { Role } from '../../DB/models/User.model';
import { v4 as uuid } from 'uuid';

export interface TokenCredentialType {
    access_token: string,
    refresh_token: string
};

export interface SignatureCredentialType {
    access_signature: string,
    refresh_signature: string
};

export type DecodedTokenType = JwtPayload;

export enum TokenEnum {
    access = "Access",
    refresh = "Refresh"
};

export enum SignatureLvl {
    bearer = "Bearer",
    system = "System"
};

export enum LogOutEnum {
    signOutFromAll = "Sign_Out_From_All",
    signOut = "Sign_Out",
    stayLoggedIn = "Stay_Logged_IN"
};

export const verifyToken = async (
    token: string,
    secret: string = process.env.JWT as string
): Promise<DecodedTokenType> => {
    return verify(token, secret) as JwtPayload;
};

export const generateToken = async (
    payload: DecodedTokenType,
    secret: string = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
    options: SignOptions = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) }
): Promise<string> => {
    return sign(payload, secret, options);
};

export const getSignatureLvl = (role: Role = Role.user): SignatureLvl => {
    let signatureLvl: SignatureLvl;
    switch (role) {
        case Role.admin:
            signatureLvl = SignatureLvl.system;
            break;
        default:
            signatureLvl = SignatureLvl.bearer;
            break;
    };
    return signatureLvl;
};

export const getSignatures = (signatureLvl: SignatureLvl = SignatureLvl.bearer): SignatureCredentialType => {
    let signatures: SignatureCredentialType = {
        access_signature: "",
        refresh_signature: ""
    };
    switch (signatureLvl) {
        case SignatureLvl.system:
            signatures.access_signature = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
            signatures.refresh_signature = process.env.REFRESH_USER_TOKEN_SIGNATURE as string
            break;
        default:
            signatures.access_signature = process.env.ACCESS_SYSTEM_TOKEN_SIGNATURE as string,
            signatures.refresh_signature = process.env.REFRESH_SYSTEM_TOKEN_SIGNATURE as string
            break;
    }
    return signatures;
};

export const createLoginCredentials = async (
    payload: Partial<UserDocLean>,
    role: Role = Role.user
): Promise<TokenCredentialType> => {
    const jwtid: string = uuid();
    const signatures: SignatureCredentialType = getSignatures(getSignatureLvl(role));
    const access_token: string = await generateToken(
        { ...payload },
        signatures.access_signature,
        {
            jwtid,
            expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN)
        }
    );
    const refresh_token: string = await generateToken(
        { ...payload },
        signatures.refresh_signature,
        {
            jwtid,
            expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN)
        }
    );
    return { access_token, refresh_token };
};

export const decodedToken = async (header: string, tokenType: TokenEnum = TokenEnum.access): Promise<DecodedTokenType> => {
    const [key, token]: string[] = header.split(" ") || [];
    if (!key || !token) {
        throw new BadRequestException("No Token Provided!");
    }
    let signatures = getSignatures(key as SignatureLvl);
    const decoded: JwtPayload = await verifyToken(
        token,
        tokenType === TokenEnum.access? signatures.access_signature : signatures.refresh_signature
    );
    if (!decoded || !decoded._id) {
        throw new UnauthorizedException("Invalid Or Expired Token!");
    }
    return decoded;
};