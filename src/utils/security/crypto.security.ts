import CryptoJS from 'crypto-js';

export const generateEncryption = async (
    plaintext: string,
    secret: string = process.env.CRYPTO_SECRET || "abcdef"
): Promise<string> => {
    return CryptoJS.AES.encrypt(plaintext, secret).toString();
};

export const generateDecryption = async (
    ciphertext: string,
    secret: string = process.env.CRYPTO_SECRET || "abcdef"
): Promise<string> => {
    return CryptoJS.AES.decrypt(ciphertext, secret).toString(CryptoJS.enc.Utf8);
};