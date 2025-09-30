import { resolve } from 'path';
import { config } from 'dotenv';

config({ path: resolve('./config/.env.development') });

import type { Express, Request, Response, NextFunction } from 'express';
import type { RateLimitRequestHandler, Options } from 'express-rate-limit';
import type { CorsOptions } from 'cors';
import { BadRequestException, globalErrorHandling } from './utils/response/error.response';
import { rateLimit } from 'express-rate-limit';
import { getFile } from './utils/multer/AWS/s3.service';
import { pipeline } from 'stream/promises';
import { authController, userController, postController } from './modules';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import connectDB from './DB/connect.db';

const bootsrap = async (): Promise<void> => {
    const app: Express = express();
    const port: string | number = process.env.PORT || 5000;

    // Cors Options
    const whitelist: string[] | undefined = process.env.ORIGINS?.split(',');
    const corsOptions: CorsOptions = {
        // Add !origin to allow access to REST Tools like postman
        origin: function (origin: any, callback: any) {
            if (whitelist?.indexOf(origin) !== -1 || !origin) {
                callback(null, true);
            } else {
                callback(new Error("Un-Authorized Access!", { cause: 404 }));
            }
        }
    };

    // Rate-Limiting Options
    const limiter: RateLimitRequestHandler = rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 500,
        handler: (req: Request, res: Response, next: NextFunction, options: Options): void => {
            res.status(429).json({ message: "Too Many Requests!" });
        },
        standardHeaders: "draft-8"
    });

    // Convert Buffer Data | Access-Origins | Response Protection | Rate Limiting
    app.use(express.json(), cors(corsOptions), helmet(), limiter);

    // Connecting To Database
    await connectDB();

    // Home Route
    app.get('/', (req: Request, res: Response) => res.json({ message: "Home Page 🏠🏠" }));

    // Authentication
    app.use('/auth', authController);

    // User
    app.use('/user', userController);

    // Post
    app.use('/post', postController);

    // // Uploads
    // app.get('/upload/pre-signed/*path', async (req: Request, res: Response): Promise<Response> => {
    //     const { path }: { path?: string[] } = req.params;
    //     console.log('x');
    //     const { downloadName, download }: { downloadName?: string, download?: string } = req.query;
    //     if (!path) {
    //         throw new BadRequestException("Invalid Path!");
    //     }
    //     const Key: string = path.join("/");
    //     const url: string = await createGetPresignedLink({
    //         Key,
    //         expiresIn: 60,
    //         downloadName: downloadName as string,
    //         download: download as string
    //     });
    //     return res.json({ message: "Done", url });
    // });

    // app.get('/upload/delete-file/*path', async (req: Request, res: Response): Promise<Response> => {
    //     const { path }: { path?: string[] } = req.params;
    //     if (!path) {
    //         throw new BadRequestException("Invalid Path");
    //     }
    //     const Key: string = path.join("/");
    //     const result = await deleteFile(Key);
    //     return res.json({ result });
    // });

    // app.get('/upload/get-directory/*path', async (req: Request, res: Response): Promise<Response> => {
    //     const { path }: { path?: string[] } = req.params;
    //     if (!path) {
    //         throw new BadRequestException("Invalid Path!");
    //     }
    //     const result: DeleteObjectCommandOutput = await getDirectoryFiles(path.join("/"));
    //     console.log(result);
    //     return res.json({ result });
    // });

    // app.get('/upload/delete-directory/*path', async (req: Request, res: Response): Promise<Response> => {
    //     const { path }: { path?: string[] } = req.params;
    //     if (!path) {
    //         throw new BadRequestException("Invalid Path!");
    //     }
    //     const result: DeleteObjectCommandOutput = await deleteDirectoryByPrefix(path.join("/"));
    //     console.log(result);
    //     return res.json({ result });
    // });

    app.get('/upload/*path', async (req: Request, res: Response): Promise<void> => {
        const { path }: { path?: string[] } = req.params;
        const { download, downloadName }: { download?: string, downloadName?: string } = req.query;
        if (!path) {
            throw new BadRequestException("Invalid Path");
        }
        const Key: string = path.join("/");
        const { Body, ContentType } = await getFile(Key);
        res.setHeader("Content-Type", `${ContentType || "application/octet-stream"}`);
        if (download === 'true') {
            res.setHeader("Content-Disposition", `attachments; filename="${downloadName || Key[-1]}"`)
        }
        return await pipeline(Body as NodeJS.ReadableStream, res);
    });

    // Invalid Route
    app.use('{/*dummy}', (req: Request, res: Response) => res.status(404).json({ message: "Page Not Found!" }));

    // Global Error Handling
    app.use(globalErrorHandling);

    // Checking Server
    app.listen(port, () => console.log(`Server Is Listening On localhost:${port}🚀🚀`));
};

export default bootsrap;