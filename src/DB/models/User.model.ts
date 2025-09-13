import type {
    HydratedDocument,
    RootFilterQuery,
    ProjectionType,
    QueryOptions,
    FlattenMaps,
    MongooseUpdateQueryOptions,
    UpdateResult,
} from 'mongoose';
import { Schema, model, models, Types } from "mongoose";
import { s3Config } from '../../utils/multer/AWS/s3.config';

export enum Gender {
    male = "Male",
    female = "Female"
};

export enum Role {
    user = "User",
    admin = "Admin"
};

export enum Provider {
    system = "System",
    google = "Google"
};

export interface IOTP {
    otp: string;
    count: number;
    expiredAt: Date;
    banUntil?: Date | undefined;
};

export interface IUser {
    firstName: string;
    lastName: string;
    username: string | undefined;
    email: string;
    confirmOtp?: IOTP;
    age?: number;
    phone?: string;
    address?: string;
    password: string;
    resetPasswordOtp?: IOTP;
    confirmEmail?: Date;
    picture?: string,
    coverPicture?: string,
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    deletedBy?: Types.ObjectId;
    restoredAt?: Date;
    restoredBy?: Types.ObjectId;
    provider: Provider;
    changeCredentialsTime?: Date;
    gender: Gender;
    role: Role;
};

export type UserUpdateType = {
    set?: Partial<IUser> | FlattenMaps<Partial<IUser>>;
    unset?: Partial<Record<keyof IUser, true>> | FlattenMaps<Partial<Record<keyof IUser, true>>>;
};

export type IDType = { _id?: Types.ObjectId };
export type UserDoc = HydratedDocument<IUser>;
export type UserDocLean = FlattenMaps<IUser> & IDType;
export type UpdateResultType = UpdateResult;
export type OTPDoc = HydratedDocument<IOTP>;
export type OTPDocLean = FlattenMaps<IOTP>;
export type UserFilterType = RootFilterQuery<IUser>;
export type UserSelectionType = ProjectionType<IUser>;
export type UserOptionsType = QueryOptions<IUser>;
export type UserUpdateOptionsType = MongooseUpdateQueryOptions<IUser>;

const OTPSchema = new Schema<IOTP>({
    otp: String,
    count: Number,
    expiredAt: Date,
    banUntil: Date
}, {
    _id: false
});

const userSchema = new Schema<IUser>({
    firstName: {
        type: String,
        required: [true, "firstName Is Required!"],
        minLength: [2, "Min Length Is 2, You Entered {VALUE}"],
        maxLength: [60, "Max Length Is 60, You Entered {VALUE}"],
    },
    lastName: {
        type: String,
        required: [true, "lastName Is Required!"],
        minLength: [2, "Min Length Is 2, You Entered {VALUE}"],
        maxLength: [60, "Max Length Is 60, You Entered {VALUE}"],
    },
    email: {
        type: String,
        required: [true, "Email Is Required!"],
        unique: [true, "Email Must Be Unique!"],
        minLength: [2, "Min Length Is 2, You Entered {VALUE}"],
    },
    age: {
        type: Number,
        required: function () {
            return this.provider === Provider.system;
        },
        minLength: [12, "Min Age Is 12, You Entered {VALUE}"]
    },
    confirmOtp: OTPSchema,
    confirmEmail: Date,
    password: {
        type: String,
        required: [
            function (): boolean {
                return this.provider === Provider.system;
            },
            "Password Is Required!"
        ],
    },
    resetPasswordOtp: OTPSchema,
    phone: String,
    address: String,
    picture: String,
    coverPicture: [String],
    changeCredentialsTime: Date,
    gender: {
        type: String,
        enum: {
            values: Object.values(Gender),
            message: `Only ${Object.values(Gender)} Are Allowed!`
        },
        default: Gender.male
    },
    role: {
        type: String,
        enum: {
            values: Object.values(Role),
            message: `Only ${Object.values(Role)} Are Allowed!`
        },
        default: Role.user
    },
    provider: {
        type: String,
        enum: {
            values: Object.values(Provider),
            message: `Only ${Object.values(Provider)} Are Allowed!`
        },
        default: Provider.system
    }
}, {
    id: true,
    autoIndex: true,
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

userSchema.virtual("username").set(function (value: string): void {
    const [firstName, lastName] = value?.split(" ") || [];
    this.set({ firstName, lastName });
}).get(function (value: string): string {
    return `${this.firstName} ${this.lastName}`
});

export const User = models.User || model<IUser>("User", userSchema);