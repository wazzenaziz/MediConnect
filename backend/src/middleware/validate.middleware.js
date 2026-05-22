// backend/src/middleware/validate.middleware.js

// We import `z` from zod, but in this file we only need it indirectly.
// The schemas (z.object({...})) will be built in other files — here we
// just receive a schema as an argument and run it. So technically we
// don't even need to import `z` in this file. We'll skip the import.

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 *
 * Usage in a route:
 *   router.post("/login", validate(loginSchema), loginController);
 *
 * If the body is valid, `req.body` is replaced with the PARSED (clean,
 * normalized) version produced by Zod, and the request continues to the
 * controller via `next()`.
 *
 * If the body is invalid, the request is rejected with HTTP 400 and a
 * structured list of errors — one entry per failed field.
 */
const validate = (schema) => {
  // This OUTER function takes the schema and returns the actual
  // Express middleware. This pattern is called a "higher-order
  // middleware" — a function that returns a middleware.
  //
  // Why this shape? Because Express expects middleware with the
  // signature (req, res, next). We can't pass the schema directly
  // into Express. So we wrap it: validate(schema) RETURNS a function
  // matching Express's signature, with the schema captured in closure.

  return (req, res, next) => {
    // `schema.safeParse(data)` is Zod's main validation method.
    // It NEVER throws — it returns one of two shapes:
    //   { success: true,  data:  <parsed clean data> }
    //   { success: false, error: <ZodError with .issues array> }
    //
    // We use safeParse instead of parse because parse throws on
    // failure, and we don't want to wrap every call in try/catch.
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Validation failed. result.error.issues is an array, with
      // one entry per failed field. Each issue looks like:
      //   {
      //     path: ["email"],          // which field failed
      //     message: "Invalid email", // human-readable reason
      //     code: "invalid_string",   // machine-readable Zod code
      //     ...other Zod-specific fields
      //   }
      //
      // We transform this into a clean, API-friendly shape that
      // the frontend can iterate over to show field-level errors.
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."), // ["address","city"] -> "address.city"
        message: issue.message,
      }));

      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
      // Note the `return` — without it, execution would continue
      // and we'd accidentally call next() after sending a response.
      // Sending two responses to the same request crashes Express.
    }

    // Validation succeeded. result.data is the CLEAN, normalized
    // version of the body. For example, if the schema had
    // .toLowerCase() on email, result.data.email is already lowercased
    // even if req.body.email was uppercase.
    //
    // We overwrite req.body with the clean version so the controller
    // automatically uses the normalized data. Without this line, the
    // controller would still see the original (un-normalized) body.
    req.body = result.data;

    // Tell Express: "validation passed, proceed to the next handler
    // (which is the controller in our case)."
    next();
  };
};

/**
 * Same as `validate`, but reads from `req.query` instead of `req.body`.
 * Express 5 makes `req.query` non-writable, so we don't overwrite it —
 * the parsed (coerced, defaulted) values are stashed on `req.validatedQuery`
 * for the controller to consume.
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    req.validatedQuery = result.data;
    next();
  };
};

module.exports = { validate, validateQuery };