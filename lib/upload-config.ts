/**
 * Upload size limit — single source of truth shared by both client validation
 * and server enforcement. Change here and it propagates everywhere.
 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_UPLOAD_MB    = MAX_UPLOAD_BYTES / (1024 * 1024); // 50
