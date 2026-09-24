export const APP_NAME = "Rajasthan Racquetball Association";
export const APP_SHORT_NAME = "RRA";

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

export const DATE_FORMATS = {
  DISPLAY_DATE: "MMM d, yyyy",
  DISPLAY_DATETIME: "MMM d, yyyy h:mm a",
  ISO_DATE: "yyyy-MM-dd",
} as const;

export const FILE_UPLOAD = {
  MAX_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_DOCUMENT_TYPES: ["application/pdf"],
} as const;

export const STATUS_LABELS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
} as const;
