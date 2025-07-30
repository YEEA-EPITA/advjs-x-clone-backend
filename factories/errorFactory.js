class ErrorFactory {
  static error({
    res,
    statusCode = 500,
    message = "Internal server error",
    details = null,
    errors = null,
  }) {
    const response = {
      statusCode,
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    };

    if (details) {
      response.details = details;
    }

    if (errors) {
      response.error = errors;
    }

    return res.status(statusCode).json(response);
  }

  static badRequest({ res, message = "Bad request", details = null }) {
    return this.error({ res, statusCode: 400, message, details });
  }

  static unauthorized({
    res,
    message = "Unauthorized access",
    details = null,
  }) {
    return this.error({ res, statusCode: 401, message, details });
  }

  static forbidden({ res, message = "Forbidden access", details = null }) {
    return this.error({ res, statusCode: 403, message, details });
  }

  static notFound({ res, message = "Resource not found", details = null }) {
    return this.error({ res, statusCode: 404, message, details });
  }

  static methodNotAllowed({
    res,
    message = "Method not allowed",
    allowedMethods = null,
  }) {
    const details = allowedMethods ? { allowedMethods } : null;
    return this.error({ res, statusCode: 405, message, details });
  }

  static conflict({ res, message = "Conflict", details = null }) {
    return this.error({ res, statusCode: 409, message, details });
  }

  static unprocessableEntity({
    res,
    message = "Unprocessable entity",
    details = null,
  }) {
    return this.error({ res, statusCode: 422, message, details });
  }

  static tooManyRequests({
    res,
    message = "Too many requests",
    retryAfter = null,
  }) {
    const details = retryAfter ? { retryAfter } : null;
    return this.error({ res, statusCode: 429, message, details });
  }

  static internalServerError({
    res,
    message = "Internal server error",
    details = null,
  }) {
    return this.error({ res, statusCode: 500, message, details });
  }

  static serviceUnavailable({
    res,
    message = "Service unavailable",
    details = null,
  }) {
    return this.error({ res, statusCode: 503, message, details });
  }

  static validationError({
    res,
    validationErrors,
    message = "Validation failed",
  }) {
    const errors = Array.isArray(validationErrors)
      ? validationErrors
      : validationErrors.array();
    return this.error({ res, statusCode: 400, message, details: null, errors });
  }

  /**
   * Token Related Errors
   */
  static tokenExpired({ res, message = "Token expired" }) {
    return this.unauthorized({
      res,
      message,
      details: { code: "TOKEN_EXPIRED" },
    });
  }

  static tokenInvalid({ res, message = "Invalid token" }) {
    return this.unauthorized({
      res,
      message,
      details: { code: "TOKEN_INVALID" },
    });
  }

  static tokenRevoked({
    res,
    message = "Token has been revoked. Please login again.",
  }) {
    return this.unauthorized({
      res,
      message,
      details: { code: "TOKEN_REVOKED" },
    });
  }
  static tokenMissing({ res, message = "Access denied. No token provided." }) {
    return this.unauthorized({
      res,
      message,
      details: { code: "TOKEN_MISSING" },
    });
  }

  static tokenMissing({ res, message = "Access denied. No token provided." }) {
    return this.unauthorized({
      res,
      message,
      details: { code: "TOKEN_MISSING" },
    });
  }

  /**
   * Database Related Errors
   */
  static databaseError({
    res,
    message = "Database operation failed",
    details = null,
  }) {
    return this.internalServerError({
      res,
      message,
      details: { type: "DATABASE_ERROR", ...details },
    });
  }

  /**
   * File Related Errors
   */
  static fileUploadError({
    res,
    message = "File upload failed",
    details = null,
  }) {
    return this.badRequest(res, message, {
      type: "FILE_UPLOAD_ERROR",
      ...details,
    });
  }

  static fileTooLarge({
    res,
    message = "File size exceeds the limit",
    details = null,
  }) {
    return this.badRequest(res, message, {
      type: "FILE_TOO_LARGE",
      ...details,
    });
  }

  static invalidFileType(res, message = "Invalid file type", details = null) {
    return this.badRequest(res, message, {
      type: "INVALID_FILE_TYPE",
      ...details,
    });
  }
}

module.exports = { ErrorFactory };
