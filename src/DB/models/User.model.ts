import { Schema, model, models, Types } from "mongoose";
import { generateHash } from '../../utils/security/hash.security';
import { generateEncryption } from '../../utils/security/crypto.security';
import { UserDoc } from '../../utils/types/mongoose.types';

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
    slug: string;
    email: string;
    confirmOtp?: IOTP;
    age?: number;
    phone?: string;
    address?: string;
    password: string;
    resetPasswordOtp?: IOTP;
    confirmEmail?: Date;
    picture?: string | undefined,
    tempPicture?: string,
    coverPictures?: string[],
    createdAt: Date;
    updatedAt?: Date;
    freezedAt?: Date;
    freezedBy?: Types.ObjectId;
    restoredAt?: Date;
    restoredBy?: Types.ObjectId;
    provider: Provider;
    changeCredentialsTime?: Date;
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
        minLength: [2, "Min Length Is 2, You Entered {VALUE}"],
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
    tempPicture: String,
    coverPictures: [String],
    freezedAt: Date,
    freezedBy: {
        type: Types.ObjectId,
        ref: 'User'
    },
    restoredAt: Date,
    restoredBy: {
        type: Types.ObjectId,
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
    console.log('x');
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
    // If Password's Updated
    if (this.isModified("password")) {
        this.password = await generateHash(this.password);
    }

    // If Phone's Updated
    if (this.phone && this.isModified("phone")) {
        this.phone = await generateEncryption(this.phone);
    }
});

// userSchema.post('save', async function (doc: UserDoc & { wasNew: boolean }, next) {
    
// });

export const User = models.User || model<IUser>("User", userSchema);