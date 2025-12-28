const { query } = require('../db');

/**
 * Audit logging middleware factory
 * Logs successful data modifications to audit_log table
 *
 * @param {string} action - The action being performed (CREATE, UPDATE, DELETE, UPLOAD)
 * @param {string} resourceType - The type of resource (layout, element, picks)
 * @returns {Function} Express middleware
 */
const auditLog = (action, resourceType) => {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        res.json = async (data) => {
            // Log after successful response (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    // Determine resource ID from params or response data
                    const resourceId = req.params?.id || data?.id || null;

                    // Build details object (exclude sensitive data)
                    const details = {
                        method: req.method,
                        path: req.originalUrl,
                        params: req.params || {},
                    };

                    // Include relevant body fields (avoid logging large uploads)
                    if (req.body && action !== 'UPLOAD') {
                        const { password, ...safeBody } = req.body;
                        details.body = safeBody;
                    }

                    // For uploads, just log counts
                    if (action === 'UPLOAD' && data) {
                        details.uploadStats = {
                            rowsProcessed: data.rowsProcessed,
                            itemsCreated: data.itemsCreated,
                            locationsCreated: data.locationsCreated
                        };
                    }

                    await query(
                        `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            req.user?.id || null,
                            action,
                            resourceType,
                            resourceId,
                            JSON.stringify(details),
                            req.ip || req.connection?.remoteAddress || null
                        ]
                    );
                } catch (err) {
                    // Log error but don't fail the request
                    console.error('Audit log error:', err.message);
                }
            }

            // Call original json method
            return originalJson(data);
        };

        next();
    };
};

module.exports = { auditLog };
