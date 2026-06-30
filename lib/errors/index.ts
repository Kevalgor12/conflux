import { ZodError } from 'zod'
import { httpStatusConstant, httpErrorMessageConstant, messageConstant } from '../constants'

// Base application error — every thrown error carries an HTTP code + a stable error type.
export class BaseError extends Error {
  public code: number
  public errorType: string

  constructor(code: number, errorType: string, message: string) {
    super(message)
    this.name = 'BaseError'
    this.code = code
    this.errorType = errorType
  }

  getDetails = () => {
    return {
      statusCode: this.code,
      error: this.errorType,
      message: this.message
    }
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string) {
    super(httpStatusConstant.BAD_REQUEST, httpErrorMessageConstant.BAD_REQUEST, message)
    this.name = 'BadRequestError'
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string) {
    super(httpStatusConstant.UNAUTHORIZED, httpErrorMessageConstant.UNAUTHORIZED, message)
    this.name = 'UnauthorizedError'
  }
}

export class AccessForbiddenError extends BaseError {
  constructor(message: string) {
    super(httpStatusConstant.ACCESS_FORBIDDEN, httpErrorMessageConstant.ACCESS_FORBIDDEN, message)
    this.name = 'AccessForbiddenError'
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(httpStatusConstant.NOT_FOUND, httpErrorMessageConstant.NOT_FOUND, message)
    this.name = 'NotFoundError'
  }
}

export class RequestConflictError extends BaseError {
  constructor(message: string) {
    super(httpStatusConstant.REQUEST_CONFLICT, httpErrorMessageConstant.REQUEST_CONFLICT, message)
    this.name = 'RequestConflictError'
  }
}

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(httpStatusConstant.BAD_REQUEST, httpErrorMessageConstant.VALIDATION_ERROR, message)
    this.name = 'ValidationError'
  }
}

export class PayloadTooLargeError extends BaseError {
  constructor(message: string) {
    super(httpStatusConstant.PAYLOAD_TOO_LARGE, httpErrorMessageConstant.PAYLOAD_TOO_LARGE, message)
    this.name = 'PayloadTooLargeError'
  }
}

export class TooManyRequestsError extends BaseError {
  constructor(message: string) {
    super(httpStatusConstant.TOO_MANY_REQUESTS, httpErrorMessageConstant.TOO_MANY_REQUESTS, message)
    this.name = 'TooManyRequestsError'
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string) {
    super(
      httpStatusConstant.INTERNAL_SERVER_ERROR,
      httpErrorMessageConstant.INTERNAL_SERVER_ERROR,
      message
    )
    this.name = 'InternalServerError'
  }
}

// Normalise any thrown value into the response error shape.
export const genericErrorHandler = (error: unknown) => {
  if (error instanceof BaseError) {
    return error.getDetails()
  }

  // Zod validation failures → 400 with the field messages.
  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => issue.message).join('; ')
    return {
      statusCode: httpStatusConstant.BAD_REQUEST,
      error: httpErrorMessageConstant.VALIDATION_ERROR,
      message: message || messageConstant.VALIDATION_FAILED
    }
  }

  return {
    statusCode: httpStatusConstant.INTERNAL_SERVER_ERROR,
    error: httpErrorMessageConstant.INTERNAL_SERVER_ERROR,
    message: messageConstant.INTERNAL_SERVER_ERROR
  }
}
