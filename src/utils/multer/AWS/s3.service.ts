import { ObjectCannedACL, PutObjectCommand } from "@aws-sdk/client-s3";
import s3Config from "./s3.config";
import { StorageEnum } from "../local/local.multer";
import { createReadStream } from "fs";
import { BadRequestException } from "../../response/error.response";


export const uploadFile = async ({
    storageType = StorageEnum.memory,
    Bucket = process.env.AWS_BUCKET_NAME,
    ACL = "private",
    path = "general",
    file
}: {
    storageType?: StorageEnum,
    Bucket?: string,
    ACL?: ObjectCannedACL,
    path?: string,
    file: Express.Multer.File
}): Promise<string> => {
    const command = new PutObjectCommand({
        Bucket,
        ACL,
        Key: `${process.env.APP_NAME}/${path}/${Math.floor(Math.random() * 10e8)}_${Date.now()}_${file.originalname}`,
        Body: storageType === StorageEnum.memory ? file.buffer : createReadStream(file.path),
        ContentType: file.mimetype
    });
    await s3Config().send(command);
    if (!command.input || !command.input.Key) {
        throw new BadRequestException("Failed To Upload The File!");
    }
    return command.input.Key;
};