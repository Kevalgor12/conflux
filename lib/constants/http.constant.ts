const httpStatusConstant = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  ACCESS_FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
}

const httpErrorMessageConstant = {
  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized',
  ACCESS_FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Not found',
  REQUEST_CONFLICT: 'Request conflict',
  VALIDATION_ERROR: 'Validation error',
  PAYLOAD_TOO_LARGE: 'Payload too large',
  TOO_MANY_REQUESTS: 'Too many requests',
  INTERNAL_SERVER_ERROR: 'Internal server error'
}

export { httpStatusConstant, httpErrorMessageConstant }
