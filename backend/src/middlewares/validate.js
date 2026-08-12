const AppError = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
  try {
    const validatedData = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // Replace the request properties with validated (and optionally stripped) data
    req.body = validatedData.body;
    req.query = validatedData.query;
    req.params = validatedData.params;
    next();
  } catch (err) {
    // If it's a ZodError, format it nicely
    if (err.errors) {
      const errorMessage = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return next(new AppError(`Validation Error: ${errorMessage}`, 400));
    }
    next(new AppError('Invalid request data', 400));
  }
};

module.exports = { validate };
