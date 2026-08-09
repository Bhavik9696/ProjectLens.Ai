import nodemailer from 'nodemailer';

/**
 * Returns a configured Nodemailer transporter.
 *
 * • In production: reads EMAIL_HOST / PORT / USER / PASS from .env
 * • In development (no credentials set): creates a free Ethereal test
 *   account automatically — the preview URL is logged to the console.
 */
async function getTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  // Real SMTP credentials provided — use them
  if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
    return nodemailer.createTransport({
      host:   EMAIL_HOST,
      port:   Number(EMAIL_PORT) || 587,
      secure: Number(EMAIL_PORT) === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  // Dev fallback: Ethereal disposable test account
  console.log('[Email] No SMTP credentials set — using Ethereal test account');
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host:   'smtp.ethereal.email',
    port:   587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

/**
 * Sends a password-reset email.
 *
 * @param {string} to       - Recipient email address
 * @param {string} name     - Recipient's display name
 * @param {string} resetUrl - Full URL containing the raw reset token
 */
export async function sendPasswordResetEmail(to, name, resetUrl) {
  const from = process.env.EMAIL_FROM || '"ProjectLens AI" <noreply@projectlens.ai>';
  const transporter = await getTransporter();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your ProjectLens AI password</title>
  <style>
    body  { margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrap { max-width: 560px; margin: 40px auto; background: #131313; border-radius: 16px; border: 1px solid rgba(255,255,255,0.09); overflow: hidden; }
    .top  { background: linear-gradient(135deg, #17170e 0%, #131313 100%); padding: 32px 40px 24px; border-bottom: 1px solid rgba(214,255,63,0.12); }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .logo-icon { width: 36px; height: 36px; background: rgba(214,255,63,0.12); border: 1px solid rgba(214,255,63,0.3); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .logo-dot { width: 14px; height: 14px; background: #d6ff3f; border-radius: 50%; }
    .logo-text { font-size: 16px; font-weight: 800; color: #f5f5f1; letter-spacing: -0.5px; }
    .logo-text span { color: #d6ff3f; }
    h1 { margin: 0; font-size: 22px; font-weight: 700; color: #f5f5f1; line-height: 1.3; }
    .body { padding: 32px 40px; }
    p  { margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #9a9a92; }
    .name { color: #f5f5f1; font-weight: 600; }
    .btn-wrap { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; padding: 14px 36px; background: #d6ff3f; color: #000 !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.2px; box-shadow: 0 0 30px -6px rgba(214,255,63,0.5); }
    .note { font-size: 12px; color: #666660; margin-top: 24px; }
    .link-fallback { word-break: break-all; color: #9cb82e; font-size: 12px; }
    .foot { padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: #505050; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="logo">
        <div class="logo-icon"><div class="logo-dot"></div></div>
        <div class="logo-text">ProjectLens<span>AI</span></div>
      </div>
      <h1>Reset your password</h1>
    </div>
    <div class="body">
      <p>Hi <span class="name">${name}</span>,</p>
      <p>We received a request to reset the password for your ProjectLens AI account. Click the button below to choose a new password. This link expires in <strong style="color:#f5f5f1">1 hour</strong>.</p>
      <div class="btn-wrap">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      <p class="note">If the button doesn't work, paste this link into your browser:</p>
      <p class="link-fallback">${resetUrl}</p>
      <p class="note">If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
    </div>
    <div class="foot">
      © ${new Date().getFullYear()} ProjectLens AI · Requirement-to-Code Traceability<br/>
      This is an automated message, please do not reply.
    </div>
  </div>
</body>
</html>
`;

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Reset your ProjectLens AI password',
    html,
    text: `Hi ${name},\n\nReset your ProjectLens AI password using this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.\n\n— ProjectLens AI`,
  });

  // In dev, log the Ethereal preview URL so the developer can view the email
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Email] Ethereal preview URL → ${previewUrl}`);
  }

  return info;
}
