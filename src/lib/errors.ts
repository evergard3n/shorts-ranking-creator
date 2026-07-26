export const ERROR_MAP = {
  E_AUTH_EMAIL_EXISTS: 'Email already exists',
  E_AUTH_INVALID_CREDS: 'Invalid credentials',
  E_AUTH_UNAUTHORIZED: 'Unauthorized',
  E_NOT_FOUND: 'Not found',
  E_VALIDATION: 'Validation failed',
  E_JOB_NOT_FOUND: 'Job not found',
} as const

export type ErrorCode = keyof typeof ERROR_MAP

export function errorMessage(code: ErrorCode): string {
  return ERROR_MAP[code]
}

export class ApiError extends Error {
  code: ErrorCode

  constructor(code: ErrorCode) {
    super(ERROR_MAP[code])
    this.code = code
    this.name = 'ApiError'
  }
}
