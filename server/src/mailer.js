const nodemailer = require("nodemailer");

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  if (process.env.SMTP_HOST) {
    // Real SMTP configured in .env
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      })
    );
  } else {
    // No SMTP configured - use a free Ethereal test inbox so the flow still
    // works end to end for a local demo. Requires internet access once, to
    // create the test account.
    transporterPromise = nodemailer
      .createTestAccount()
      .then((testAccount) =>
        nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        })
      )
      .catch((err) => {
        console.warn(
          "[mailer] Could not create an Ethereal test inbox (likely no internet). " +
            "Reset emails will only be logged to the console instead of actually sending."
        );
        return null;
      });
  }

  return transporterPromise;
}

async function sendPasswordResetEmail({ to, name, code, resetUrl }) {
  const subject = "Reset your Club Portal password";
  const text = `Hi ${name},

We got a request to reset your Club Portal password.

Reset link: ${resetUrl}
Or enter this code in the app: ${code}

This link and code expire in 30 minutes. If you didn't request this, you
can ignore this email.`;

  const html = `
    <p>Hi ${name},</p>
    <p>We got a request to reset your Club Portal password.</p>
    <p><a href="${resetUrl}">Click here to reset your password</a></p>
    <p>Or enter this code in the app: <strong>${code}</strong></p>
    <p>This link and code expire in 30 minutes. If you didn't request this, you can ignore this email.</p>
  `;

  console.log(`\n[mailer] Password reset requested for ${to}`);
  console.log(`[mailer] Reset code: ${code}`);
  console.log(`[mailer] Reset link: ${resetUrl}`);

  const transporter = await getTransporter();
  if (!transporter) {
    console.log("[mailer] (no transporter available - code/link above is the only delivery)\n");
    return { delivered: false };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || "Club Portal <no-reply@clubportal.local>",
      to,
      subject,
      text,
      html,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[mailer] Preview the sent email here: ${previewUrl}\n`);
    }
    return { delivered: true, previewUrl };
  } catch (err) {
    console.warn("[mailer] Failed to send email, falling back to console-only:", err.message);
    return { delivered: false };
  }
}

module.exports = { sendPasswordResetEmail };
