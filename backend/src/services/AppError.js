/**
 * Custom error class for application errors.
 * Allows setting HTTP status codes for proper API error responses.
 */
export class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AppError";
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Wraps an async function to catch errors and pass them to Express error handler.
 * Usage: router.get('/path', asyncHandler(myAsyncFunction))
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
