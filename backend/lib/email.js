/**
 * Email service integration using Resend
 *
 * Setup:
 * 1. Create account at resend.com
 * 2. Get API key from dashboard
 * 3. Add RESEND_API_KEY to .env
 * 4. For production: verify your sending domain in Resend dashboard
 */

const { Resend } = require('resend');

// Initialize Resend client (will be null if no API key)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Default sender - update domain after verification
const DEFAULT_FROM = process.env.EMAIL_FROM || 'HeatmapSlotting <onboarding@resend.dev>';

/**
 * Send waitlist confirmation email
 */
async function sendWaitlistConfirmationEmail({
  email,
  firstName,
  position,
  referralCode,
  confirmationToken,
}) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const confirmUrl = `${baseUrl}/api/waitlist/confirm?token=${confirmationToken}`;
  const referralUrl = `${baseUrl}/landing?ref=${referralCode}`;

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #1e293b;
        background-color: #f8fafc;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 40px 20px;
        background-color: #ffffff;
      }
      .header {
        text-align: center;
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 1px solid #e2e8f0;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: #2563eb;
      }
      .position-badge {
        display: inline-block;
        font-size: 48px;
        font-weight: bold;
        color: #2563eb;
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        padding: 16px 32px;
        border-radius: 12px;
        margin: 16px 0;
      }
      .button {
        display: inline-block;
        padding: 16px 32px;
        background: #2563eb;
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        margin: 8px 0;
      }
      .button:hover {
        background: #1d4ed8;
      }
      .referral-box {
        background: #f1f5f9;
        border-radius: 12px;
        padding: 24px;
        margin: 24px 0;
        text-align: center;
      }
      .referral-code {
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 28px;
        font-weight: bold;
        color: #2563eb;
        letter-spacing: 3px;
        background: #ffffff;
        padding: 12px 24px;
        border-radius: 8px;
        border: 2px dashed #2563eb;
        display: inline-block;
        margin: 12px 0;
      }
      .benefits-list {
        text-align: left;
        padding-left: 0;
        list-style: none;
      }
      .benefits-list li {
        padding: 8px 0;
        padding-left: 28px;
        position: relative;
      }
      .benefits-list li::before {
        content: "\\2713";
        position: absolute;
        left: 0;
        color: #22c55e;
        font-weight: bold;
      }
      .footer {
        margin-top: 40px;
        padding-top: 24px;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        color: #64748b;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">HeatmapSlotting</div>
      </div>

      <h1 style="text-align: center; margin-bottom: 8px;">Welcome, ${firstName}!</h1>
      <p style="text-align: center; color: #64748b; margin-top: 0;">You're officially on the waitlist</p>

      <div style="text-align: center;">
        <p style="margin-bottom: 8px;">Your position:</p>
        <div class="position-badge">#${position}</div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${confirmUrl}" class="button">Confirm Your Email</a>
        <p style="font-size: 12px; color: #64748b; margin-top: 8px;">
          Confirming your email ensures you receive updates
        </p>
      </div>

      <div class="referral-box">
        <h3 style="margin-top: 0;">Want to skip ahead?</h3>
        <p style="color: #64748b;">
          Share your unique code with friends. For every person who joins, you'll move up 5 spots!
        </p>
        <div class="referral-code">${referralCode}</div>
        <p style="margin-bottom: 0;">
          <a href="${referralUrl}" style="color: #2563eb;">Share this link</a>
        </p>
      </div>

      <h3>What's next?</h3>
      <ul class="benefits-list">
        <li>Early access invitations before public launch</li>
        <li>Exclusive beta features to try first</li>
        <li>Founding member discounts (20% off for life)</li>
        <li>Direct input on features we build</li>
      </ul>

      <p>Questions? Just reply to this email - we read every message.</p>

      <p style="margin-top: 32px;">
        Cheers,<br>
        <strong>The HeatmapSlotting Team</strong>
      </p>

      <div class="footer">
        <p>
          You're receiving this because you signed up for the HeatmapSlotting waitlist.<br>
          <a href="${baseUrl}" style="color: #64748b;">Visit our website</a>
        </p>
      </div>
    </div>
  </body>
</html>
  `;

  // If no Resend API key, log email details for development
  if (!resend) {
    console.log('=== EMAIL NOT SENT (No RESEND_API_KEY) ===');
    console.log('To:', email);
    console.log('Subject:', `You're #${position} on the HeatmapSlotting waitlist!`);
    console.log('Confirm URL:', confirmUrl);
    console.log('Referral Code:', referralCode);
    console.log('==========================================');
    return { success: true, mock: true };
  }

  try {
    const result = await resend.emails.send({
      from: DEFAULT_FROM,
      to: email,
      subject: `You're #${position} on the HeatmapSlotting waitlist!`,
      html,
    });

    console.log('Email sent successfully:', result);
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw - email failure shouldn't block signup
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendWaitlistConfirmationEmail,
};
