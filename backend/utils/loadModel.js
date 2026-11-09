// Loads a model without crashing the server if the file does not exist.
// Pass a path relative to a sibling folder of utils/, e.g. "../models/Resume".
function loadModel(relativePath) {
  try {
    return require(relativePath);
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      console.error(`Model not found, skipping: ${relativePath}`);
      return null;
    }
    throw e;
  }
}

// Which field links a document to its owner (userId or user)
function ownerFilter(Model, userId) {
  if (!Model || !Model.schema) return null;
  if (Model.schema.path("userId")) return { userId };
  if (Model.schema.path("user")) return { user: userId };
  return null;
}

module.exports = { loadModel, ownerFilter };