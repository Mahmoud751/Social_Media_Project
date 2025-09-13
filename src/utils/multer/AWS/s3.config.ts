import { S3Client } from '@aws-sdk/client-s3';

// Lazy Initialization
let s3Client: S3Client | null = null;
const s3Config = () => {
    if (!s3Client) {
        s3Client = new S3Client({
            region: process.env.ACCESS_REGION as string,
            credentials: {
                accessKeyId: process.env.ACCESS_KEY_ID as string,
                secretAccessKey: process.env.SECRET_ACCESS_KEY_ID as string
            }
        });
    }
    return s3Client;
};

export default s3Config;