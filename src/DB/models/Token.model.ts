import {
    Schema,
    Types,
    model,
    models,
} from 'mongoose';

export interface IToken {
    jti: string,
    expiresIn: number,
    userId: Types.ObjectId
};

const tokenSchema = new Schema({
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
        type: Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
});

export const Token = models.Token || model<IToken>("Token", tokenSchema);