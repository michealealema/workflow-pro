const transporter = require('../config/email')

async function sendVerificationEmail(email, token) {
  const frontendUrl =
    process.env.FRONTEND_URL || 'http://localhost:5173'

  const verificationUrl =
    `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`

  const info = await transporter.sendMail({
    from: {
      name: 'WorkFlow Pro',
      address: process.env.SMTP_USER,
    },
    to: email,
    subject: 'Verify your WorkFlow Pro account',
    text: `Please verify your email by visiting: ${verificationUrl}`,
    html: `
      <h2>Welcome to WorkFlow Pro!</h2>
      <p>Thank you for creating an account.</p>
      <p>Please click the button below to verify your email.</p>
      <a href="${verificationUrl}"
         style="display:inline-block;padding:12px 20px;
         background:#2563eb;color:white;text-decoration:none;
         border-radius:6px;">
        Verify Email
      </a>
      <p>This verification link expires in 30 minutes.</p>
    `,
  })

  console.log('Verification email delivery result:', {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  })

  if (info.rejected?.length || !info.accepted?.length) {
    throw new Error('SMTP did not accept the verification recipient.')
  }

  return info
}

module.exports = sendVerificationEmail