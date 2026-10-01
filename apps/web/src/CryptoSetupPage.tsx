import {
  useMemo,
  useState,
} from "react";

import {
  createIdentityEnrollmentPayload,
  generateRecoveryKey,
  selectRecoveryConfirmationIndexes,
} from "./crypto/identity";

type CryptoSetupPageProps = {
  onComplete: () => void;
};

type Stage =
  | "setup"
  | "recovery"
  | "confirm"
  | "success";

export default function CryptoSetupPage({
  onComplete,
}: CryptoSetupPageProps) {
  const [stage, setStage] =
    useState<Stage>("setup");

  const [vaultPassphrase, setVaultPassphrase] =
    useState("");

  const [confirmPassphrase, setConfirmPassphrase] =
    useState("");

  const [recoveryKey, setRecoveryKey] =
    useState("");

  const [confirmationIndexes, setConfirmationIndexes] =
    useState<number[]>([]);

  const [confirmationWords, setConfirmationWords] =
    useState<Record<number, string>>({});

  const [error, setError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const recoveryWords = useMemo(
    () => recoveryKey.split(" "),
    [recoveryKey],
  );

  const beginEnrollment = async () => {
    setError("");

    if (vaultPassphrase.length < 12) {
      setError(
        "Use a vault passphrase with at least 12 characters.",
      );
      return;
    }

    if (
      vaultPassphrase !==
      confirmPassphrase
    ) {
      setError(
        "The vault passphrases do not match.",
      );
      return;
    }

    try {
      /*
       * Generate the Recovery Key only in the browser.
       */
      const generatedRecoveryKey =
        generateRecoveryKey();

      setRecoveryKey(generatedRecoveryKey);

      const indexes =
        selectRecoveryConfirmationIndexes();

      setConfirmationIndexes(indexes);

      setStage("recovery");
    } catch (error) {
      console.error(
        "Recovery key generation failed:",
        error,
      );

      setError(
        "Unable to generate the Recovery Key.",
      );
    }
  };

  const confirmRecoveryKey = () => {
    setError("");

    for (const index of confirmationIndexes) {
      const expected =
        recoveryWords[index]
          ?.trim()
          .toLowerCase();

      const entered =
        confirmationWords[index]
          ?.trim()
          .toLowerCase();

      if (!expected || expected !== entered) {
        setError(
          `Recovery Key word ${index + 1} is incorrect.`,
        );
        return;
      }
    }

    setStage("confirm");
  };

  const enroll = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      /*
       * All private-key encryption happens here in
       * the browser.
       */
      const {
        payload,
      } =
        await createIdentityEnrollmentPayload(
          vaultPassphrase,
          recoveryKey,
        );

      const response = await fetch(
        "/api/v1/identity/enroll",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "IDENTITY_ENROLLMENT_FAILED",
        );
      }

      setStage("success");
    } catch (error) {
      console.error(
        "Identity enrollment failed:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Identity enrollment failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (stage === "success") {
    return (
      <section className="auth-layout section-container">
        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="eyebrow">
              SECURITY READY
            </span>

            <h2>
              Your cryptographic identity is enrolled.
            </h2>

            <p>
              Your private key is protected locally.
              CapsuleLink does not receive your vault
              passphrase or Recovery Key.
            </p>
          </div>

          <button
            className="button button-primary button-full button-large"
            onClick={onComplete}
          >
            Continue to your dashboard →
          </button>
        </div>
      </section>
    );
  }

  if (stage === "recovery") {
    return (
      <section className="auth-layout section-container">
        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="eyebrow">
              RECOVERY KEY
            </span>

            <h2>
              Save your Recovery Key
            </h2>

            <p>
              This key is shown once. Store it offline
              somewhere secure. Do not email it or share
              it with anyone.
            </p>
          </div>

          <div className="info-note">
            <strong>
              Your 24-word Recovery Key
            </strong>

            <p
              style={{
                marginTop: 12,
                wordBreak: "break-word",
                lineHeight: 1.8,
              }}
            >
              {recoveryKey}
            </p>
          </div>

          <button
            className="button button-primary button-full button-large"
            onClick={confirmRecoveryKey}
          >
            I saved my Recovery Key →
          </button>

          {error && (
            <p className="form-error">
              {error}
            </p>
          )}
        </div>
      </section>
    );
  }

  if (stage === "confirm") {
    return (
      <section className="auth-layout section-container">
        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="eyebrow">
              CONFIRM RECOVERY
            </span>

            <h2>
              Confirm three Recovery Key words
            </h2>

            <p>
              Enter the requested words exactly as
              shown in your Recovery Key.
            </p>
          </div>

          <div className="auth-form">
            {confirmationIndexes.map(
              (index) => (
                <label
                  className="field"
                  key={index}
                >
                  <span>
                    Word {index + 1}
                  </span>

                  <input
                    type="text"
                    autoComplete="off"
                    value={
                      confirmationWords[index] ||
                      ""
                    }
                    onChange={(event) =>
                      setConfirmationWords(
                        (current) => ({
                          ...current,
                          [index]:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </label>
              ),
            )}
          </div>

          {error && (
            <p className="form-error">
              {error}
            </p>
          )}

          <button
            className="button button-primary button-full button-large"
            onClick={enroll}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Securing your identity..."
              : "Complete secure enrollment →"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-layout section-container">
      <div className="auth-card">
        <div className="auth-card-heading">
          <span className="eyebrow">
            CRYPTOGRAPHIC IDENTITY
          </span>

          <h2>
            Secure your CapsuleLink vault
          </h2>

          <p>
            Your login password and vault passphrase
            are separate. Your vault passphrase never
            leaves this browser.
          </p>
        </div>

        <div className="auth-form">
          <label className="field">
            <span>
              Vault passphrase
            </span>

            <input
              type="password"
              autoComplete="new-password"
              value={vaultPassphrase}
              onChange={(event) =>
                setVaultPassphrase(
                  event.target.value,
                )
              }
              placeholder="At least 12 characters"
            />
          </label>

          <label className="field">
            <span>
              Confirm vault passphrase
            </span>

            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassphrase}
              onChange={(event) =>
                setConfirmPassphrase(
                  event.target.value,
                )
              }
            />
          </label>
        </div>

        <div className="info-note">
          <strong>
            Important
          </strong>

          <p>
            If you lose both your vault passphrase
            and Recovery Key, CapsuleLink cannot
            recover the encrypted private key.
          </p>
        </div>

        {error && (
          <p className="form-error">
            {error}
          </p>
        )}

        <button
          className="button button-primary button-full button-large"
          onClick={beginEnrollment}
        >
          Generate secure identity →
        </button>
      </div>
    </section>
  );
}
