import { z } from 'zod'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default max upload size pulled from env or falling back to 500 MB */
export const MAX_UPLOAD_SIZE_MB = parseInt(
  process.env.MAX_UPLOAD_SIZE_MB ?? '500',
  10
)
export const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(100, 'Name must not exceed 100 characters.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must not exceed 128 characters.'),
})

export type SignUpInput = z.infer<typeof signUpSchema>

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

export type SignInInput = z.infer<typeof signInSchema>

// ---------------------------------------------------------------------------
// Project schemas
// ---------------------------------------------------------------------------

export const createProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(200, 'Title must not exceed 200 characters.'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must not exceed 2 000 characters.')
    .optional(),
  language: z
    .string()
    .trim()
    .min(2, 'Language code must be at least 2 characters.')
    .max(10, 'Language code must not exceed 10 characters.')
    .optional(),
  tags: z
    .array(z.string().trim().max(50, 'Each tag must not exceed 50 characters.'))
    .max(20, 'You can add at most 20 tags.')
    .optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>

export const updateProjectSchema = createProjectSchema.partial()

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

// ---------------------------------------------------------------------------
// Upload schemas
// ---------------------------------------------------------------------------

export const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export const uploadValidationSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1, 'File name is required.')
    .max(255, 'File name must not exceed 255 characters.'),
  fileSize: z
    .number()
    .int()
    .positive('File size must be positive.')
    .max(MAX_UPLOAD_SIZE, `File size must not exceed ${MAX_UPLOAD_SIZE_MB} MB.`),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({
      message: `MIME type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}.`,
    }),
  }),
})

export type UploadValidationInput = z.infer<typeof uploadValidationSchema>

// ---------------------------------------------------------------------------
// Story schemas
// ---------------------------------------------------------------------------

export const createStorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(200, 'Title must not exceed 200 characters.'),
  projectId: z.string().cuid('Invalid project ID.'),
})

export type CreateStoryInput = z.infer<typeof createStorySchema>

export const addStorySegmentSchema = z.object({
  storyId: z.string().cuid('Invalid story ID.'),
  transcriptSegmentId: z
    .string()
    .cuid('Invalid transcript segment ID.')
    .optional(),
  inlineText: z
    .string()
    .trim()
    .max(10_000, 'Inline text must not exceed 10 000 characters.')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1_000, 'Notes must not exceed 1 000 characters.')
    .optional(),
  label: z
    .string()
    .trim()
    .max(100, 'Label must not exceed 100 characters.')
    .optional(),
})

export type AddStorySegmentInput = z.infer<typeof addStorySegmentSchema>

export const reorderStorySegmentsSchema = z.object({
  storyId: z.string().cuid('Invalid story ID.'),
  segmentIds: z
    .array(z.string().cuid('Each segment ID must be a valid CUID.'))
    .min(1, 'At least one segment ID is required.'),
})

export type ReorderStorySegmentsInput = z.infer<typeof reorderStorySegmentsSchema>

// ---------------------------------------------------------------------------
// Subtitle schemas
// ---------------------------------------------------------------------------

export const SUBTITLE_FORMATS = ['SRT', 'VTT', 'ASS'] as const
export type SubtitleFormatOption = (typeof SUBTITLE_FORMATS)[number]

export const generateSubtitleSchema = z.object({
  projectId: z.string().cuid('Invalid project ID.'),
  format: z.enum(SUBTITLE_FORMATS, {
    errorMap: () => ({
      message: `Format must be one of: ${SUBTITLE_FORMATS.join(', ')}.`,
    }),
  }),
})

export type GenerateSubtitleInput = z.infer<typeof generateSubtitleSchema>

// ---------------------------------------------------------------------------
// Export schemas
// ---------------------------------------------------------------------------

export const EXPORT_TYPES = [
  'TRANSCRIPT_TXT',
  'TRANSCRIPT_JSON',
  'SUBTITLE_SRT',
  'SUBTITLE_VTT',
  'STORY_JSON',
  'EDIT_PREP',
  'METADATA_JSON',
] as const

export type ExportTypeOption = (typeof EXPORT_TYPES)[number]

export const createExportSchema = z.object({
  projectId: z.string().cuid('Invalid project ID.'),
  type: z.enum(EXPORT_TYPES, {
    errorMap: () => ({
      message: `Export type must be one of: ${EXPORT_TYPES.join(', ')}.`,
    }),
  }),
})

export type CreateExportInput = z.infer<typeof createExportSchema>

// ---------------------------------------------------------------------------
// Support schema
// ---------------------------------------------------------------------------

export const SUPPORT_CATEGORIES = [
  'BUG',
  'FEATURE_REQUEST',
  'BILLING',
  'GENERAL',
  'CONTENT',
] as const

export type SupportCategoryOption = (typeof SUPPORT_CATEGORIES)[number]

export const createSupportIssueSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES, {
    errorMap: () => ({
      message: `Category must be one of: ${SUPPORT_CATEGORIES.join(', ')}.`,
    }),
  }),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters.')
    .max(5_000, 'Message must not exceed 5 000 characters.'),
  projectId: z
    .string()
    .cuid('Invalid project ID.')
    .optional(),
  context: z.record(z.unknown()).optional(),
})

export type CreateSupportIssueInput = z.infer<typeof createSupportIssueSchema>

// ---------------------------------------------------------------------------
// Pagination / query helpers
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationInput = z.infer<typeof paginationSchema>
