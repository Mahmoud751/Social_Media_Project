import type { ZodType } from "zod/v4";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { BadRequestException } from "../utils/response/error.response";
import { Gender } from "../DB/models/User.model";
import { isValidObjectId } from "mongoose";
import { LogOutEnum } from "../utils/security/token.security";

type KeyReqType = keyof Request;
type SchemaType = Partial<Record<KeyReqType, ZodType>>;
type ValidationErrorsType = Array<{
	key: KeyReqType;
	details: Array<{
		message: string;
		path: string | number | symbol | undefined;
	}>;
}>;

export const generalFields = {
	username: z.string().min(2, "Min Length Is 2").max(50, "Max Length Is 50"),
	password: z.string().regex(
		new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.[a-zA-Z]).{8,16}$/),
		"Invalid Password Format!"
	),
	id: z.string().refine((data) => {
		return isValidObjectId(data);
	}, {
		error: "Invalid ID Format!",
		path: ["custom"]
	}),
	email: z.email("Invalid Email Format!"),
	phone: z.string().regex(
		new RegExp(/^(002|\+2)?01[0125][0-9]{8}$/),
		"Invalid Phone Format!"
	),
	address: z.string().min(3, "Min Length Is 3").max(50, "Min Length Is 50"),
	flag: z.enum(LogOutEnum, `Only ${Object.values(LogOutEnum)} Are Allowed!`).default(LogOutEnum.signOut),
	gender: z.enum(Gender, `Only ${Object.values(Gender)} Are Allowed!`),
	age: z.number().positive().min(10, "Min Age Is 10").max(80, "Max Age Is 80"),
	otp: z.string().regex(new RegExp(/^\d{6}$/), "Invalid OTP Number")
};

export const validation = (schema: SchemaType): RequestHandler => {
	return async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		const validationErrors: ValidationErrorsType = [];
		const keys = Object.keys(schema) as KeyReqType[];
		for (const key of keys) {
			if (schema[key]) {
				const result = schema[key].safeParse(req[key]);
				if (result.error) {
					validationErrors.push({
						key,
						details: JSON.parse(result.error.message).map((element: any) => {
							return { path: element.path[0], message: element.message };
						}),
					});
				}
			}
		}
		if (validationErrors.length) {
			throw new BadRequestException("ValidationError", validationErrors);
		}
		next();
    };
};
