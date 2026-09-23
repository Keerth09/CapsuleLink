import { Resend } from "resend";
import { config } from "../config.js";

const resend = new Resend(config.resendApiKey);

export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
): Promise<void> {
  const verificationUrl =
    `${config.webOrigin}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  await resend.emails.send({
    from: config.resendFromEmail,
    to: email,
    subject: "Verify your CapsuleLink email",
    html: `
      <h2>Verify your CapsuleLink email</h2>
      <p>Please verify your email address to continue using CapsuleLink.</p>
      <p>
        <a href="${verificationUrl}">
          Verify Email
        </a>
      </p>
      <p>This verification link expires in 24 hours.</p>
    `,
  });
}
