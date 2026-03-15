export const TRAINING_BUCKET = "training-materials";
export const TRAINING_MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024;

export const TRAINING_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const TRAINING_ACCEPT_ATTRIBUTE = [
  ".pdf",
  ".ppt",
  ".pptx",
  ".ppsx",
  ".mp4",
  ".webm",
  ".mov",
].join(",");
