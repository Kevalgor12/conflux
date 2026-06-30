const messageConstant = {
  // Generic
  SUCCESS: 'Success',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  REQUEST_FAILED: 'Request failed',

  // Auth
  UNAUTHENTICATED: 'You must be signed in to do this',
  LOGIN_SUCCESS: 'Logged in successfully',
  LOGOUT_SUCCESS: 'Logged out successfully',

  // Documents
  NO_ACCESS: 'You do not have access to this document',
  INSUFFICIENT_ROLE: 'You do not have permission to perform this action',
  DOCUMENT_NOT_FOUND: 'Document not found',
  DOCUMENT_CREATED: 'Document created successfully',
  DOCUMENT_RETRIEVED: 'Document retrieved successfully',
  DOCUMENT_UPDATED: 'Document updated successfully',
  DOCUMENT_DELETED: 'Document deleted successfully',
  DOCUMENTS_RETRIEVED: 'Documents retrieved successfully',

  // Members
  MEMBERS_RETRIEVED: 'Members retrieved successfully',
  MEMBER_ADDED: 'Member added successfully',
  MEMBER_UPDATED: 'Member role updated successfully',
  MEMBER_REMOVED: 'Member removed successfully',
  USER_NOT_FOUND: 'No account exists for that email',
  ALREADY_MEMBER: 'That user is already a member',
  CANNOT_MODIFY_OWNER: 'The document owner cannot be modified',

  // Versions
  VERSION_CREATED: 'Version saved successfully',
  VERSIONS_RETRIEVED: 'Versions retrieved successfully',
  VERSION_NOT_FOUND: 'Version not found',
  VERSION_RESTORED: 'Version restored successfully',

  // Validation / payloads
  VALIDATION_FAILED: 'Some fields are invalid',
  PAYLOAD_TOO_LARGE: 'The request payload is too large',

  // AI
  AI_DISABLED: 'AI features are not configured on this server',
  AI_RATE_LIMITED: 'Too many AI requests — please slow down'
}

export { messageConstant }
