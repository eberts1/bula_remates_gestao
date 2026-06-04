import { z } from 'zod';
import {
  ANIMAL_SEXES,
  ANIMAL_TYPES,
  IMPORT_RESOLUTIONS,
  LIVESTOCK_CATEGORIES,
} from './client-tags';



export const registerSchema = z.object({

  email: z.string().email(),

  password: z.string().min(8),

  name: z.string().min(2),

  tenantName: z.string().min(2),

  tenantSlug: z

    .string()

    .min(2)

    .max(50)

    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),

});



export const loginSchema = z.object({

  email: z.string().email(),

  password: z.string().min(1),

});



export const uploadUrlRequestSchema = z.object({

  fileName: z.string().min(1).max(255),

  mimeType: z.string().min(1).max(127),

  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024),

  clientId: z.string().uuid(),

});



const brazilianStateSchema = z
  .string()
  .length(2, 'UF deve ter 2 caracteres')
  .regex(/^[A-Za-z]{2}$/, 'UF inválida')
  .transform((s) => s.toUpperCase());

export const clientPropertySchema = z.object({
  id: z.string().uuid().optional(),
  farmName: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: brazilianStateSchema,
  routeNotes: z.string().max(2000).optional(),
  phone: z.string().max(30).optional(),
  ie: z.string().max(30).optional(),
  nirf: z.string().max(30).optional(),
});

const animalTypeSchema = z.enum(ANIMAL_TYPES).optional().nullable();
const animalSexSchema = z.enum(ANIMAL_SEXES).optional().nullable();
const livestockCategorySchema = z.enum(LIVESTOCK_CATEGORIES).optional().nullable();

export const clientTagsSchema = z.object({
  animalType: animalTypeSchema,
  animalSex: animalSexSchema,
  livestockCategory: livestockCategorySchema,
  intentionIds: z.array(z.string().uuid()).optional(),
  intentionNotes: z.string().max(2000).optional().nullable(),
});

export const clientCreateSchema = z.object({
  name: z.string().min(2).max(200),
  document: z.string().min(1).max(20).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  addressFull: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  active: z.boolean().optional(),
  responsibleId: z.string().uuid().nullable().optional(),
  properties: z.array(clientPropertySchema).optional(),
  animalType: animalTypeSchema,
  animalSex: animalSexSchema,
  livestockCategory: livestockCategorySchema,
  intentionIds: z.array(z.string().uuid()).optional(),
  intentionNotes: z.string().max(2000).optional().nullable(),
});

export const clientUpdateSchema = clientCreateSchema.partial();

export const clientFormPublicSubmitSchema = z.object({
  name: z.string().min(2).max(200),
  document: z.string().min(1).max(20),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  addressFull: z.string().min(1).max(500),
  properties: z.array(clientPropertySchema).min(1, 'Informe ao menos uma propriedade'),
});

export const clientFormTokenCreateSchema = z.object({
  type: z.enum(['create', 'edit']),
  clientId: z.string().uuid().optional(),
  expiresInHours: z.coerce.number().int().positive().max(168).optional(),
});

export const publicFormUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024),
});



export const clientListQuerySchema = z.object({

  q: z.string().max(100).optional(),

  page: z.coerce.number().int().positive().optional(),

  limit: z.coerce.number().int().positive().max(100).optional(),

  animalType: z.enum(ANIMAL_TYPES).optional(),

  animalSex: z.enum(ANIMAL_SEXES).optional(),

  livestockCategory: z.enum(LIVESTOCK_CATEGORIES).optional(),

  intentionId: z.string().uuid().optional(),

});



export const importSourceHintsSchema = z.object({
  animalType: animalTypeSchema,
  animalSex: animalSexSchema,
  livestockCategory: livestockCategorySchema,
  intentionIds: z.array(z.string().uuid()).optional(),
  intentionNotes: z.string().max(2000).optional(),
});



export const importRowDataSchema = z.object({
  rowIndex: z.number().int().nonnegative(),
  name: z.string().min(1).max(200),
  document: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  property: clientPropertySchema,
  animalType: animalTypeSchema,
  animalSex: animalSexSchema,
  livestockCategory: livestockCategorySchema,
  intentionIds: z.array(z.string().uuid()).optional(),
  intentionNotes: z.string().max(2000).optional().nullable(),
});



export const importConflictSchema = z.object({
  clientId: z.string().uuid(),
  matchReason: z.enum(['document', 'phone', 'name_city']),
  existing: z.object({
    id: z.string().uuid(),
    name: z.string(),
    document: z.string().nullable(),
    phone: z.string().nullable(),
    city: z.string().nullable(),
  }),
});



export const importCommitRowSchema = importRowDataSchema.extend({
  resolution: z.enum(IMPORT_RESOLUTIONS).default('create'),
  selected: z.boolean().optional(),
  conflictClientId: z.string().uuid().optional(),
});



export const importCommitSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sourceType: z.string().min(1),
  rows: z.array(importCommitRowSchema).min(1).max(5000),
});



export const teamCreateSchema = z.object({

  name: z.string().min(2).max(100),

  description: z.string().max(500).optional(),

});



export const teamUpdateSchema = teamCreateSchema.partial();



export const collaboratorCreateSchema = z.object({

  teamId: z.string().uuid(),

  name: z.string().min(2).max(200),

  email: z.string().email().optional().or(z.literal('')),

  phone: z.string().max(30).optional(),

  role: z.string().max(100).optional(),

  active: z.boolean().optional(),

});



export const collaboratorUpdateSchema = collaboratorCreateSchema

  .omit({ teamId: true })

  .partial()

  .extend({

    teamId: z.string().uuid().optional(),

  });



export const collaboratorListQuerySchema = z.object({

  q: z.string().max(100).optional(),

  teamId: z.string().uuid().optional(),

  active: z.coerce.boolean().optional(),

  page: z.coerce.number().int().positive().optional(),

  limit: z.coerce.number().int().positive().max(100).optional(),

});



export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;

export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>;

export type ClientPropertyInput = z.infer<typeof clientPropertySchema>;

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;

export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;

export type ClientFormPublicSubmitInput = z.infer<typeof clientFormPublicSubmitSchema>;

export type ClientFormTokenCreateInput = z.infer<typeof clientFormTokenCreateSchema>;

export type PublicFormUploadUrlInput = z.infer<typeof publicFormUploadUrlSchema>;

export type TeamCreateInput = z.infer<typeof teamCreateSchema>;

export type CollaboratorCreateInput = z.infer<typeof collaboratorCreateSchema>;

export type ClientTagsInput = z.infer<typeof clientTagsSchema>;

export type ImportSourceHints = z.infer<typeof importSourceHintsSchema>;

export type ImportRowData = z.infer<typeof importRowDataSchema>;

export type ImportCommitInput = z.infer<typeof importCommitSchema>;

export type ImportCommitRow = z.infer<typeof importCommitRowSchema>;


