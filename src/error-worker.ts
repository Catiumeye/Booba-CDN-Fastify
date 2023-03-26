import { FastifyError, ValidationResult } from "fastify";
import { SchemaErrorDataVar } from "fastify/types/schema";


export class HttpException implements FastifyError {
    constructor(
        message: string, 
        statusCode: number
    ) {
        this.message = message;
        this.statusCode = statusCode;
    }
    code: string;
    name: string;
    statusCode?: number;
    validation?: ValidationResult[];
    validationContext?: SchemaErrorDataVar;
    message: string;
    stack?: string;
}

export const errorHandler = async (fastify, opts, next) => {
    fastify.setErrorHandler((err: FastifyError, req, reply) => {
        
        reply.code(err.statusCode || 500).send({ message: err.message })
    })
    next();
}