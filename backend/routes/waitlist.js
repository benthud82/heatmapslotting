const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { sendWaitlistConfirmationEmail } = require('../lib/email');

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
};

const validateCompanySize = (size) => {
  const validSizes = ['solo', '2-10', '11-50', '51-200', '200+'];
  return !size || validSizes.includes(size);
};

/**
 * POST /api/waitlist
 * Join the waitlist
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      email,
      firstName,
      companyName,
      companySize,
      role,
      referralCode,
      utmSource,
      utmMedium,
      utmCampaign,
    } = req.body;

    // Validate required fields
    if (!email || !firstName) {
      return res.status(400).json({
        error: 'Email and first name are required',
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Please enter a valid email address',
      });
    }

    if (!validateCompanySize(companySize)) {
      return res.status(400).json({
        error: 'Invalid company size',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing signup
    const existing = await query(
      `SELECT id, email_confirmed, waitlist_position, unique_referral_code
       FROM waitlist_signups
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      const signup = existing.rows[0];
      return res.json({
        message: "You're already on the list!",
        position: signup.waitlist_position,
        referralCode: signup.unique_referral_code,
        alreadyExists: true,
      });
    }

    // Handle referral - find referrer and validate code
    let referrerId = null;
    if (referralCode) {
      const referrer = await query(
        `SELECT id FROM waitlist_signups
         WHERE unique_referral_code = $1`,
        [referralCode.toUpperCase()]
      );

      if (referrer.rows.length > 0) {
        referrerId = referrer.rows[0].id;
      }
    }

    // Get IP and user agent
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.socket.remoteAddress ||
      null;
    const userAgent = req.headers['user-agent'] || null;

    // Insert new signup
    const result = await query(
      `INSERT INTO waitlist_signups (
        email, first_name, company_name, company_size, role,
        referral_code, ip_address, user_agent,
        utm_source, utm_medium, utm_campaign
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING waitlist_position, unique_referral_code, confirmation_token`,
      [
        normalizedEmail,
        firstName.trim(),
        companyName?.trim() || null,
        companySize || null,
        role || null,
        referralCode?.toUpperCase() || null,
        ipAddress,
        userAgent,
        utmSource || null,
        utmMedium || null,
        utmCampaign || null,
      ]
    );

    const signup = result.rows[0];

    // Process referral - bump referrer's position
    if (referrerId) {
      try {
        await query('SELECT process_referral($1)', [referrerId]);
      } catch (err) {
        console.error('Error processing referral:', err);
        // Don't fail the signup if referral processing fails
      }
    }

    // Send confirmation email (async, don't block response)
    sendWaitlistConfirmationEmail({
      email: normalizedEmail,
      firstName: firstName.trim(),
      position: signup.waitlist_position,
      referralCode: signup.unique_referral_code,
      confirmationToken: signup.confirmation_token,
    }).catch((err) => console.error('Email send error:', err));

    res.status(201).json({
      message: 'Successfully joined the waitlist!',
      position: signup.waitlist_position,
      referralCode: signup.unique_referral_code,
    });
  } catch (error) {
    // Handle unique constraint violation (race condition)
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'This email is already on the waitlist',
      });
    }
    next(error);
  }
});

/**
 * GET /api/waitlist/confirm
 * Confirm email address
 */
router.get('/confirm', async (req, res, next) => {
  try {
    const { token } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!token) {
      return res.redirect(`${frontendUrl}/landing?error=invalid-token`);
    }

    const result = await query(
      `UPDATE waitlist_signups
       SET email_confirmed = true,
           confirmed_at = NOW()
       WHERE confirmation_token = $1
         AND email_confirmed = false
       RETURNING email`,
      [token]
    );

    if (result.rows.length === 0) {
      // Token not found or already confirmed
      return res.redirect(`${frontendUrl}/landing?error=invalid-token`);
    }

    return res.redirect(`${frontendUrl}/landing?confirmed=true`);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/waitlist/stats
 * Get waitlist statistics (for display on landing page)
 * Public endpoint - returns limited stats
 */
router.get('/stats', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as total_signups,
        COUNT(DISTINCT company_name) FILTER (WHERE company_name IS NOT NULL) as unique_companies,
        COUNT(*) FILTER (WHERE email_confirmed = true) as confirmed_signups
      FROM waitlist_signups
    `);

    const stats = result.rows[0];

    res.json({
      totalSignups: parseInt(stats.total_signups) || 0,
      uniqueCompanies: parseInt(stats.unique_companies) || 0,
      confirmedSignups: parseInt(stats.confirmed_signups) || 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/waitlist/position/:email
 * Check waitlist position by email
 */
router.get('/position/:email', async (req, res, next) => {
  try {
    const { email } = req.params;

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const result = await query(
      `SELECT waitlist_position, unique_referral_code, referral_count
       FROM waitlist_signups
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Email not found on waitlist',
      });
    }

    const signup = result.rows[0];
    res.json({
      position: signup.waitlist_position,
      referralCode: signup.unique_referral_code,
      referralCount: signup.referral_count,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
