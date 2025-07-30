const validateSchema =
  ({ body, query, params }) =>
  async (req, res, next) => {
    try {
      if (body) {
        req.body = await body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
      }
      if (query) {
        req.query = await query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });
      }
      if (params) {
        req.params = await params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
      }

      next();
    } catch (err) {
      return res.status(400).json({
        statusCode: 400,
        type: "ValidationError",
        errors: err.inner.map((e) => ({
          field: e.path,
          message: e.message,
        })),
      });
    }
  };

module.exports = validateSchema;
