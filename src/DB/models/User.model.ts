import type { UserDoc, UserFilterType } from '../../utils/types/mongoose.types';
import { type Types, Schema, model, models } from "mongoose";
import { generateHash } from '../../utils/security/hash.security';
import { generateEncryption } from '../../utils/security/crypto.security';

export enum Gender {
    male = "Male",
    female = "Female"
};

export enum Role {
    user = "User",
    admin = "Admin",
    super_admin = "Super_Admin"
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
    slug: string;
    email: string;
    confirmOtp?: IOTP;
    age?: number;
    phone?: string;
    address?: string;
    password: string;
    resetPasswordOtp?: IOTP;
    confirmEmail?: Date;
    picture?: string | undefined;
    coverPictures?: string[];
    friends?: Types.ObjectId[];
    blockList?: Types.ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
    freezedAt?: Date;
    freezedBy?: Types.ObjectId;
    restoredAt?: Date;
    restoredBy?: Types.ObjectId;
    provider: Provider;
    changeCredentialsTime?: Date;
    two_step_verification?: IOTP;
    tempEmail?: string;
    twoSV: boolean;
    gender: Gender;
    role: Role;
};

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
        minlength: [2, "Min Length Is 2, You Entered {VALUE}"],
        maxLength: [25, "Max Length Is 60, You Entered {VALUE}"],
    },
    lastName: {
        type: String,
        required: [true, "lastName Is Required!"],
        minLength: [2, "Min Length Is 2, You Entered {VALUE}"],
        maxLength: [25, "Max Length Is 60, You Entered {VALUE}"],
    },
    slug: {
        type: String,
        required: [true, "slug Is Required!"],
        minLength: [5, "Min Length Is 2, You Entered {VALUE}"],
        maxLength: [51, "Max Length Is 60, You Entered {VALUE}"],
    },
    email: {
        type: String,
        required: [true, "Email Is Required!"],
        unique: [true, "Email Must Be Unique!"],
        minLength: [2, "Min Length Is 2, You Entered {VALUE}"],
    },
    tempEmail: String,
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
    coverPictures: [String],
    freezedAt: Date,
    freezedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    restoredAt: Date,
    restoredBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
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
    two_step_verification: OTPSchema,
    twoSV: {
        type: Boolean,
        default: false
    },
    provider: {
        type: String,
        enum: {
            values: Object.values(Provider),
            message: `Only ${Object.values(Provider)} Are Allowed!`
        },
        default: Provider.system
    },
    friends: [{ type: Schema.Types.ObjectId, ref: "User"}],
    blockList: [{ type: Schema.Types.ObjectId, ref: "User"}]
}, {
    id: true,
    autoIndex: true,
    timestamps: true,
    strictQuery: true,
    optimisticConcurrency: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

userSchema.virtual("username").set(function (value: string): void {
    const [firstName, lastName] = value?.split(" ") || [];
    this.set({ firstName, lastName, slug: value.replaceAll(/\s+/g, "-") });
}).get(function (value: string): string {
    return `${this.firstName} ${this.lastName}`
});

userSchema.pre('validate', function (next) {
    if (!this.slug.includes("-")) {
        return next(new Error("Invalid Slug Format!"));
    }
    next();
});

userSchema.pre('save', async function (this: UserDoc & { wasNew: boolean }, next) {
    // this.wasNew = this.isNew || this.isModified("email");
    // If Password's Updatedn
    if (this.isModified("password")) {
        this.password = await generateHash(this.password);
    }

    // If Phone's Updated
    if (this.phone && this.isModified("phone")) {
        this.phone = await generateEncryption(this.phone);
    }
});

userSchema.pre(["find", "findOne", "findOneAndUpdate", "updateOne"], async function (next) {
    if (this.getOptions().paranoid) {
        this.where({ freezedAt: { $exists: false } } as UserFilterType);
    }
});

export const User = models.User || model<IUser>("User", userSchema);