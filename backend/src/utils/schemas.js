const { z } = require('zod');

// Auth Schemas
const loginSchema = z.object({
  body: z.object({
    email: z.string().min(1),
    password: z.string().min(6),
  }).strip(),
  query: z.any(),
  params: z.any(),
});

const sessionSchema = z.object({
  body: z.object({
    sessionId: z.string().min(1),
    machineId: z.string().optional(),
  }).strip(),
  query: z.any(),
  params: z.any(),
});

// Jobs Schemas
const createJobSchema = z.object({
  body: z.object({
    file: z.object({
      originalName: z.string(),
      filename: z.string(),
      mimetype: z.string(),
      size: z.number(),
      pages: z.number().optional(),
    }),
    settings: z.object({
      color: z.enum(['bw', 'color']).default('bw'),
      duplex: z.enum(['single', 'double']).default('single'),
      copies: z.number().int().min(1).default(1),
      pageRangeType: z.enum(['all', 'custom']).default('all'),
      customRange: z.string().optional(),
      pagesToPrint: z.number().int().min(1).default(1),
    }),
  }).strip(),
  query: z.any(),
  params: z.any(),
});

const updateJobStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING_PAYMENT', 'WAITING', 'PRINTING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  }).strip(),
  query: z.any(),
  params: z.object({
    id: z.string(),
  }).strip(),
});

// Machines Schemas
const createMachineSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    location: z.string().min(1),
    type: z.enum(['KIOSK', 'COUNTER']).default('KIOSK'),
    companyId: z.string().uuid().optional(),
  }).strip(),
  query: z.any(),
  params: z.any(),
});

const updateMachineSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  }).strip(),
  query: z.any(),
  params: z.object({
    id: z.string(),
  }).strip(),
});

// Companies Schemas
const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    contactPerson: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
  }).strip(),
  query: z.any(),
  params: z.any(),
});

module.exports = {
  loginSchema,
  sessionSchema,
  createJobSchema,
  updateJobStatusSchema,
  createMachineSchema,
  updateMachineSchema,
  createCompanySchema,
};
