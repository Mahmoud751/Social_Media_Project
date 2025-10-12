import { Gender } from "../../../DB/models/user.model";

export interface ILogin {
    email: string;
    password: string;
}

export interface ISignup extends ILogin {
    username: string;
    age: number;
    gender?: Gender;
    phone: string;
}

export interface ISignupEmail {
    name?: string,
    email?: string,
    picture?: string
};

export interface IEmail {
    email: string
};

export interface IEmailConfirmation extends IEmail {
    otp: string
};

export interface IDToken {
    idToken: string
};
