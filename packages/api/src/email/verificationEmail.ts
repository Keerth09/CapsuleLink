
import { Resend } from "resend";
import { config } from "../config.js";

const resend = new Resend(config.resendApiKey);

export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
): Promise<void> {
  const verificationUrl =
    `${config.webOrigin}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  // Local development: log the verification link instead of sending email.
  if (process.env.NODE_ENV !== "production") {
    console.log("\n========================================");
    console.log("CAPSULELINK DEVELOPMENT VERIFICATION");
    console.log("Email:", email);
    console.log("Verification URL:", verificationUrl);
    console.log("========================================\n");
    return;
  }

  // Production: send the verification email through Resend.
  const { data, error } = await resend.emails.send({
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

  if (error) {
    console.error("Resend verification email failed:", error);
    throw new Error("VERIFICATION_EMAIL_SEND_FAILED");
  }

  console.log("Verification email sent:", data?.id);
}
