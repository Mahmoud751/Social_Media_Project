import { ObjectCannedACL, PutObjectCommand } from "@aws-sdk/client-s3";
import { StorageEnum } from "../local/local.multer";
import { createReadStream } from "fs";
import { ApplicationException, BadRequestException } from "../../response/error.response";
import { Upload } from "@aws-sdk/lib-storage";
import s3Config from "./s3.config";

export interface FileOptionsType {
    storageType?: StorageEnum,
    Bucket?: string,
    ACL?: ObjectCannedACL,
    path?: string,
    file?: Express.Multer.File,
    files?: Express.Multer.File[],
    isLarge?: boolean
};

export const uploadFile = async ({
    storageType = StorageEnum.memory,
    Bucket = process.env.AWS_BUCKET_NAME as string,
    ACL = "private",
    path = "general",
    file
}: FileOptionsType): Promise<string> => {
    if (!file) {
        throw new BadRequestException("File Is Not Provided!");
    }
    const command = new PutObjectCommand({
        Bucket,
        ACL,
        Key: `${process.env.APP_NAME}/${path}/${Math.floor(Math.random() * 10e8)}_${Date.now()}_${file.originalname}`,
        Body: storageType === StorageEnum.memory ? file.buffer : createReadStream(file.path),
        ContentType: file.mimetype
    });
    await s3Config().send(command);
    if (!command.input || !command.input.Key) {
        throw new ApplicationException("Failed To Upload The File!");
    }
    return command.input.Key;
};

export const uploadLargeFile = async ({
    storageType = StorageEnum.disk,
    Bucket = process.env.AWS_BUCKET_NAME,
    ACL = "private",
    path = "general",
    file
}: FileOptionsType): Promise<string> => {
    if (!file) {
        throw new BadRequestException("File Is Not Provided!");
    }
    const upload = new Upload({
        client: s3Config(),
        params: {
            Bucket,
            ACL,
            Key: `${process.env.APP_NAME}/${path}/${Math.floor(Math.random() * 10e8)}_${Date.now()}_${file.originalname}`,
            Body: storageType !== StorageEnum.memory ? createReadStream(file.path) : file.buffer,
            ContentType: file.mimetype
        },
        partSize: 5 * 1024 * 1024
    });
    upload.on("httpUploadProgress", (progress) => {
        console.log(progress);
    });
    
    const { Key }: { Key?: string | undefined } = await upload.done();
    if (!Key) {
        throw new ApplicationException("Failed To Upload");
    }
    return Key;
};

export const uploadFiles = async ({
    storageType = StorageEnum.memory,
    Bucket = process.env.AWS_BUCKET_NAME as string,
    ACL = "private",
    path = "general",
    files,
    isLarge = false
}: FileOptionsType): Promise<string[]> => {
    if (!files || !files.length) {
        throw new BadRequestException("Files Are Not Provided!");
    }

    try {
        let keys: string[];
        if (isLarge) {
            keys = await Promise.all(files.map(
                (file: Express.Multer.File) => uploadLargeFile({ Bucket, ACL, path, file })
            ));
        } else {
            keys = await Promise.all((files).map(
                (file: Express.Multer.File) => uploadFile({ storageType, Bucket, ACL, path, file })
            ));
        }
        return keys;
    } catch (error) {
        throw new BadRequestException("Failed To Upload Files!");
    }
};