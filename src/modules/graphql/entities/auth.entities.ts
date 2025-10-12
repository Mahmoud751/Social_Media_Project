import { UserDoc } from "../../../utils/types/mongoose.types";

export interface ILoginResponse {
    credentials: {
        access_token: string,
        refresh_token: string
    };
};

export interface ISignupResponse {
    user: UserDoc
};