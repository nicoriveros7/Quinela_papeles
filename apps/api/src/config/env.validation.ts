import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),
  API_PREFIX: Joi.string().default('api'),
  WEB_CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).optional(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
});
