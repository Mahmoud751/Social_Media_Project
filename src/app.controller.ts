import { config } from 'dotenv';

config({});

import type { Express, Request, Response, NextFunction } from 'express';
import type { RateLimitRequestHandler, Options } from 'express-rate-limit';
import type { CorsOptions } from 'cors';
import { globalErrorHandling } from './utils/response/error.response';
import { rateLimit } from 'express-rate-limit';
import authController from './modules/auth/auth.controller';
import userController from './modules/user/user.controller';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import connectDB from './DB/connection/db.connection';

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

    // Convert Buffer Data | Accessing | Response Protection | Rate Limiting
    app.use(express.json(), cors(corsOptions), helmet(), limiter);

    await connectDB();

    // Home Route
    app.get('/', (req: Request, res: Response) => res.json({ message: "Home Page 🏠🏠"}));

    // Authentication
    app.use('/auth', authController);

    // User
    app.use('/user', userController);

    // Invalid Route
    app.use('{/*dummy}', (req: Request, res: Response) => res.json({ message: "Page Not Found❌❌" }));

    // Global Error Handling
    app.use(globalErrorHandling);

    // Checking Server
    app.listen(port, () => console.log(`Server Is Listening On localhost:${port}🚀🚀`));
};

export default bootsrap;