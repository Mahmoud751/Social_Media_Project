import type { Request } from "express";
import { tmpdir } from "os";
import multer, { FileFilterCallback } from "multer";
import { BadRequestException } from "../../response/error.response";

export enum StorageEnum {
    memory = "Memory",
    disk = "Disk"
};

export type FileType = {
    image?: string[],
    document?: string[],
    video?: string[],
    audio?: string[]
};

export const generateFileOrDirName = (filename: string  = "", splitor: string = ""): string => {
    return `${Math.floor(Math.random() * 10e8)}${splitor}${Date.now()}${splitor}${filename}`;
};

export const fileValidation = {
    image: ['image/png', 'image/jpg', 'image/jpeg'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    audio: ['audio/mp3', 'audio/mpeg'],
    video: ['video/mp4', 'video/mpeg']
};

export const cloudFileUpload = ({
    storageType = StorageEnum.memory,
    validation,
    maxSizeMB = 5,
}: {
    storageType?: string,
    validation: string[],
    maxSizeMB?: number
}): multer.Multer => {
    let storage: multer.StorageEngine = storageType === StorageEnum.memory
        ? multer.memoryStorage()
        : multer.diskStorage({
            destination: tmpdir(),
            filename: function (req: Request, file: Express.Multer.File, callback): void {
                callback(null, generateFileOrDirName(file.originalname, "_"));
            }
        });
    const fileFilter = function (req: Request, file: Express.Multer.File, callback: FileFilterCallback): void {
        if (!validation.includes(file.mimetype)) {
            callback(new BadRequestException("File Validation Error", [
                {
                    key: "file",
                    details: [{ path: "file", message: "Invalid File Format" }]
                }
            ]));
        }
        callback(null, true);
    }
    return multer({
        fileFilter,
        storage,
        limits: {
            fileSize: maxSizeMB * 1024 * 1024
        }
    });
};