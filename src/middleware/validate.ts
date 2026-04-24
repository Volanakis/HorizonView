import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Validates that req.params.id is a positive integer.
 * Must be used on routes with an :id segment.
 */
export function validateParam(req: Request, res: Response, next: NextFunction): void {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Invalid id parameter — must be a positive integer' }
    });
    return;
  }
  next();
}

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: 'Invalid query parameters',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }
        });
        return;
      }
      next(error);
    }
  };
};