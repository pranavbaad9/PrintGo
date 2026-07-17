const { z } = require('zod');

const createJobSchema = z.object({
  file: z.object({
    originalName: z.string(),
    filename: z.string(),
    mimetype: z.string(),
    size: z.number().int().positive(),
    pages: z.number().int().positive()
  }),
  settings: z.object({
    color: z.enum(['bw', 'color']),
    duplex: z.enum(['single', 'double']),
    copies: z.number().int().min(1).max(100),
    pagesToPrint: z.number().int().min(1),
    pageRangeType: z.enum(['all', 'custom']),
    customRange: z.string().optional()
  }),
  price: z.number().positive()
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    next(error); // Passes to global error handler
  }
};

module.exports = { createJobSchema, validate };
