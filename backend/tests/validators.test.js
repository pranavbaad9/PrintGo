const { createJobSchema } = require('../utils/validators');

describe('Zod Validators', () => {
  it('should validate a correct job object', () => {
    const validJob = {
      file: {
        originalName: 'test.pdf',
        filename: 'uuid-1234.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        pages: 5
      },
      settings: {
        color: 'bw',
        duplex: 'single',
        copies: 2,
        pagesToPrint: 5,
        pageRangeType: 'all'
      },
      price: 20
    };
    
    const result = createJobSchema.safeParse(validJob);
    expect(result.success).toBe(true);
  });

  it('should reject invalid copies', () => {
    const invalidJob = {
      file: {
        originalName: 'test.pdf',
        filename: 'uuid-1234.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        pages: 5
      },
      settings: {
        color: 'bw',
        duplex: 'single',
        copies: 0, // invalid (min 1)
        pagesToPrint: 5,
        pageRangeType: 'all'
      },
      price: 20
    };
    
    const result = createJobSchema.safeParse(invalidJob);
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const invalidJob = {
      file: {
        originalName: 'test.pdf'
      }
    };
    
    const result = createJobSchema.safeParse(invalidJob);
    expect(result.success).toBe(false);
  });
});
