const { z } = require('zod');

// Authentication Schemas
const createSessionSchema = z.object({
  body: z.object({
    machineId: z.string().uuid("Invalid machine ID format"),
  }),
});

const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  }),
});

// Jobs Schemas
const createJobSchema = z.object({
  body: z.object({
    file: z.object({
      originalName: z.string(),
      filename: z.string(),
      mimetype: z.string(),
      size: z.number().int().positive(),
      pages: z.number().int().positive().default(1),
    }),
    settings: z.object({
      color: z.boolean(),
      duplex: z.boolean(),
      copies: z.number().int().min(1).max(100),
      pageRangeType: z.enum(['all', 'custom']),
      customRange: z.string().nullable().optional(),
    }).refine(data => {
      if (data.pageRangeType === 'custom') {
        return !!data.customRange && /^[0-9,-]+$/.test(data.customRange);
      }
      return true;
    }, {
      message: "Invalid custom range format",
      path: ["customRange"],
    }),
  }),
});

module.exports = {
  createSessionSchema,
  adminLoginSchema,
  createJobSchema,
};
