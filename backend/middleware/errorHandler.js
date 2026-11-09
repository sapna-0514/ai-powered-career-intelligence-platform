exports.notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = err.status || err.statusCode || 500;
  let message = err.message || "Server error";

  if (err.name === "CastError") {
    status = 400;
    message = "Invalid id";
  } else if (err.name === "ValidationError" && err.errors) {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.code === 11000) {
    status = 409;
    message = "That value already exists";
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    message = "Invalid or expired token";
  } else if (err.type === "entity.too.large") {
    status = 413;
    message = "Request body too large";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON";
  } else if (message === "Not allowed by CORS") {
    status = 403;
  }

  if (status >= 500) {
    console.error("Unhandled error:", err);
    if (process.env.NODE_ENV === "production") message = "Something went wrong";
  }
  res.status(status).json({ message });
};