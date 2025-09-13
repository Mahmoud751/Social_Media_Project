import { hash, compare } from "bcrypt";

export const generateHash = async (
    plaintext: string,
    salt_round: number = Number(process.env.SALT_ROUND)
): Promise<string> => {
    return await hash(plaintext, salt_round);
};

export const compareHash = async (
    plaintext: string,
    hashed_text: string
): Promise<boolean> => {
    return await compare(plaintext, hashed_text);
};