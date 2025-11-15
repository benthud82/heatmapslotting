/**
 * Mock authentication middleware
 * This allows development without full auth implementation
 * Will be replaced with real JWT auth later
 */
const authenticateToken = (req, res, next) => {
  // Mock user for development - using a valid UUID format
  // This UUID will be used consistently for all mock requests
  req.user = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'mock@example.com',
  };
  next();
};

module.exports = {
  authenticateToken,
};

