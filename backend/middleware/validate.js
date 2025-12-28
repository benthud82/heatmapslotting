const { validationResult } = require('express-validator');

/**
 * Express-validator result handler
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
    }
    next();
};

/**
 * Validate warehouse element input
 */
const validateElement = (req, res, next) => {
  const { x_coordinate, y_coordinate, width, height, label, element_type } = req.body;

  // Type checks for coordinates (if provided)
  if (x_coordinate !== undefined) {
    if (typeof x_coordinate !== 'number' || !isFinite(x_coordinate)) {
      return res.status(400).json({ error: 'x_coordinate must be a finite number' });
    }
    if (x_coordinate < 0 || x_coordinate > 10000) {
      return res.status(400).json({ error: 'x_coordinate must be between 0 and 10000' });
    }
  }

  if (y_coordinate !== undefined) {
    if (typeof y_coordinate !== 'number' || !isFinite(y_coordinate)) {
      return res.status(400).json({ error: 'y_coordinate must be a finite number' });
    }
    if (y_coordinate < 0 || y_coordinate > 10000) {
      return res.status(400).json({ error: 'y_coordinate must be between 0 and 10000' });
    }
  }

  // Validate width if provided
  if (width !== undefined) {
    if (typeof width !== 'number' || !isFinite(width)) {
      return res.status(400).json({ error: 'width must be a finite number' });
    }
    if (width <= 0 || width > 1000) {
      return res.status(400).json({ error: 'width must be between 1 and 1000' });
    }
  }

  // Validate height if provided
  if (height !== undefined) {
    if (typeof height !== 'number' || !isFinite(height)) {
      return res.status(400).json({ error: 'height must be a finite number' });
    }
    if (height <= 0 || height > 1000) {
      return res.status(400).json({ error: 'height must be between 1 and 1000' });
    }
  }

  // String length checks
  if (label !== undefined && label !== null) {
    if (typeof label !== 'string') {
      return res.status(400).json({ error: 'label must be a string' });
    }
    if (label.length > 100) {
      return res.status(400).json({ error: 'label must be 100 characters or less' });
    }
  }

  // Enum checks for element_type
  const validTypes = ['bay', 'flow_rack', 'full_pallet', 'text', 'line', 'arrow'];
  if (element_type !== undefined) {
    if (!validTypes.includes(element_type)) {
      return res.status(400).json({ error: `element_type must be one of: ${validTypes.join(', ')}` });
    }
  }

  next();
};

/**
 * Validate layout input
 */
const validateLayout = (req, res, next) => {
  const { name, canvas_width, canvas_height } = req.body;

  // Validate name
  if (name !== undefined) {
    if (typeof name !== 'string') {
      return res.status(400).json({ error: 'name must be a string' });
    }
    if (name.length > 255) {
      return res.status(400).json({ error: 'name must be 255 characters or less' });
    }
    if (name.trim().length === 0) {
      return res.status(400).json({ error: 'name cannot be empty' });
    }
  }

  // Validate canvas dimensions
  if (canvas_width !== undefined) {
    if (typeof canvas_width !== 'number' || !isFinite(canvas_width)) {
      return res.status(400).json({ error: 'canvas_width must be a finite number' });
    }
    if (canvas_width < 100 || canvas_width > 10000) {
      return res.status(400).json({ error: 'canvas_width must be between 100 and 10000' });
    }
  }

  if (canvas_height !== undefined) {
    if (typeof canvas_height !== 'number' || !isFinite(canvas_height)) {
      return res.status(400).json({ error: 'canvas_height must be a finite number' });
    }
    if (canvas_height < 100 || canvas_height > 10000) {
      return res.status(400).json({ error: 'canvas_height must be between 100 and 10000' });
    }
  }

  next();
};

/**
 * Validate UUID parameter
 */
const validateUUID = (paramName) => {
  return (req, res, next) => {
    const uuid = req.params[paramName] || req.query[paramName] || req.body[paramName];

    if (uuid !== undefined) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(uuid)) {
        return res.status(400).json({ error: `${paramName} must be a valid UUID` });
      }
    }

    next();
  };
};

module.exports = { validate, validateElement, validateLayout, validateUUID };
