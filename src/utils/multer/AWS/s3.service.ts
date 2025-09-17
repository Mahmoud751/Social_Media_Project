import {
    _Object,
    DeleteObjectCommand,
    DeleteObjectCommandOutput,
    DeleteObjectsCommand,
    DeleteObjectsCommandOutput,
    GetObjectCommand,
    GetObjectCommandOutput,
    ListObjectsV2Command,
    ListObjectsV2CommandOutput,
    ObjectCannedACL,
    PutObjectCommand
} from "@aws-sdk/client-s3";
import { StorageEnum } from "../local/local.multer";
import { createReadStream } from "fs";
import { ApplicationException, BadRequestException } from "../../response/error.response";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Config from "./s3.config";

export interface FileOptionsType {
    storageType?: StorageEnum;
    Bucket?: string;
    ACL?: ObjectCannedACL;
    path?: string;
    file?: Express.Multer.File;
    files?: Express.Multer.File[];
    isLarge?: boolean
};

export interface PresignedUploadType {
    Bucket?: string;
    path?: string;
    originalname: string;
    ContentType: string;
    expiresIn?: number
};

export interface PresignedGetType {
    Bucket?: string;
    downloadName?: string;
    download?: string;
    Key: string;
    expiresIn?: number;
};

export interface UploadPresignedPayloadType {
    url: string,
    key: string
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

export const getFile = async (
    Key: string,
    Bucket: string = process.env.AWS_BUCKET_NAME as string
): Promise<GetObjectCommandOutput> => {
    const command = new GetObjectCommand({ Bucket, Key });
    return await s3Config().send(command);
};

export const getDirectoryFiles = async (
    path: string,
    Bucket: string = process.env.AWS_BUCKET_NAME as string
): Promise<ListObjectsV2CommandOutput> => {
    const command = new ListObjectsV2Command({
        Bucket,
        Prefix: `${process.env.APP_NAME}/${path}`
    });
    return (await s3Config().send(command));
};

export const deleteFile = async (
    Key: string,
    Bucket: string = process.env.AWS_BUCKET_NAME as string
): Promise<DeleteObjectCommandOutput> => {
    const command = new DeleteObjectCommand({ Bucket, Key });
    return await s3Config().send(command);
};

export const deleteFiles = async (
    urls: string[],
    Bucket: string = process.env.AWS_BUCKET_NAME as string
): Promise<DeleteObjectsCommandOutput> => {
    const Objects = urls.map((url: string) => ({ Key: url }));
    const command = new DeleteObjectsCommand({
        Bucket,
        Delete: { Objects, Quiet: true }
    });
    return await s3Config().send(command);
};

export const deleteDirectoryByPrefix = async (
    path: string,
    Bucket: string = process.env.AWS_BUCKET_NAME as string
): Promise<DeleteObjectCommandOutput> => {
    const files: ListObjectsV2CommandOutput = await getDirectoryFiles(path, Bucket);
    console.log(files);
    if (!files || !files.KeyCount) {
        throw new BadRequestException("No Files Exist!");
    }
    const urls: string[] = (files.Contents as _Object[]).map((content: _Object) => content.Key as string);
    return await deleteFiles(urls, Bucket);
};

export const createUploadPresignedLink = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    path = "general",
    expiresIn = 300,
    originalname,
    ContentType,
}: PresignedUploadType): Promise<UploadPresignedPayloadType> => {
    const command = new PutObjectCommand({
        Bucket,
        Key: `${process.env.APP_NAME}/${path}/${Math.floor(Math.random() * 10e8)}_${Date.now()}_${originalname}`,
        ContentType,
    });
    const url: string = await getSignedUrl(s3Config(), command, { expiresIn });
    const key = command.input.Key as string;
    if (!key) {
        throw new BadRequestException("Invaild Presigned URL Or Key Path!");
    }
    return { url, key };
};

export const createGetPresignedLink = async ({
    Key,
    expiresIn = 300,
    Bucket = process.env.AWS_BUCKET_NAME as string,
    downloadName = "dummy",
    download = "false"
}: PresignedGetType): Promise<string> => {
    // Enable Downloading
    const ResponseContentDisposition: string | undefined = 
        download === 'true' ? `attachments; filename="${downloadName || Key[-1]}"` : undefined

    // Retrieve File
    const command = new GetObjectCommand({
        Bucket, Key, ResponseContentDisposition
    });

    // Generate Presigned URL
    const url: string = await getSignedUrl(s3Config(), command, { expiresIn });
    if (!url) {
        throw new BadRequestException("Failed To Get The File!");
    }
    return url;
};