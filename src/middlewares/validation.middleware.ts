import type { ZodType } from "zod/v4";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { BadRequestException } from "../utils/response/error.response";
import { Gender } from "../DB/models/user.model";
import { isValidObjectId } from "mongoose";
import { LogOutEnum } from "../utils/security/token.security";
import { AllowComments, Availability, LikeEnum } from "../DB/models/post.model";
import { AuthRequestHandler, IAuthRequest } from "../utils/types/Express.types";

type KeyReqType = keyof Request;
type SchemaType = Partial<Record<KeyReqType, ZodType>>;
type ValidationErrorsType = Array<{
	key: KeyReqType;
	details: Array<{
		message: string;
		path: (string | number | symbol | undefined)[];
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
		path: ["ID"]
	}),
	email: z.email("Invalid Email Format!").toLowerCase(),
	phone: z.string().regex(
		new RegExp(/^(002|\+2)?01[0125][0-9]{8}$/),
		"Invalid Phone Format!"
	),
	address: z.string().min(3, "Min Length Is 3").max(50, "Min Length Is 50"),
	flag: z.enum(LogOutEnum, `Only ${Object.values(LogOutEnum)} Are Allowed!`).default(LogOutEnum.signOut),
	gender: z.enum(Gender, `Only ${Object.values(Gender)} Are Allowed!`),
	age: z.number().positive().min(10, "Min Age Is 10").max(80, "Max Age Is 80"),
	otp: z.string().regex(new RegExp(/^\d{6}$/), "Invalid OTP Number"),
	file: function ({ fieldname, mimetype }: { fieldname: string, mimetype: string[] }) {
		return z.strictObject({
			fieldname: z.literal(fieldname, `Only ${fieldname} Are Allowed!`),
			originalname: z.string("Field Must Be String"),
			encoding: z.string("Field Must Be String"),
			mimetype: z.enum(mimetype, `Only ${Object.values(mimetype)} Are Allowed`),
			buffer: z.instanceof(Buffer, { error: "Value Must Be Of Type Buffer" }).optional(),
			path: z.string("Invalid Path Type!").optional(),
			size: z.number("Field Must Be Number").positive("Field Must Be Positive!")
		})
	},
	action: z.enum(LikeEnum).default(LikeEnum.like),
	content: z.string().min(2).max(20000),
	availability: z.enum(Availability),
	allowComments: z.enum(AllowComments)
};

export const validation = (schema: SchemaType): AuthRequestHandler | RequestHandler => {
	return async (
		req: IAuthRequest | Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		if (req.file) {
			req.body.attachments = [req.file];
		} else if (req.files) {
			req.body.attachments = req.files;
		}
		const validationErrors: ValidationErrorsType = [];
		const keys = Object.keys(schema) as KeyReqType[];
		for (const key of keys) {
			if (schema[key]) {
				const result = schema[key].safeParse(req[key]);
				if (result.error) {
					validationErrors.push({
						key,
						details: JSON.parse(result.error.message).map((element: any) => {
							return { path: element.path, message: element.message };
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
