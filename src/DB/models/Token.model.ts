import {
    Schema,
    Types,
    model,
    models,
} from 'mongoose';

export interface IToken {
    jti: string;
    expiresIn: number;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
};

const tokenSchema = new Schema<IToken>({
    jti: {
        type: String,
        required: true,
        unique: true
    },
    expiresIn: {
        type: Number,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true,
    strictQuery: true,
});

export const Token = models.Token || model<IToken>("Token", tokenSchema);