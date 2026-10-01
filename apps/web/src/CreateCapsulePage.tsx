import {
  useState,
  type FormEvent,
} from "react";

import {
  encryptCapsuleContent,
  wrapDekForRecipient,
} from "./crypto/capsule.js";

type CreateCapsulePageProps = {
  onBack: () => void;
  onCreated: () => void;
};

type BeneficiaryLookup = {
  userId: string;
  email: string;
  publicKey: string;
  keyVersion: number;
};

const API = "/api/v1";

export default function CreateCapsulePage({
  onBack,
  onCreated,
}: CreateCapsulePageProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [beneficiaryEmail, setBeneficiaryEmail] =
    useState("");

  const [checkInInterval, setCheckInInterval] =
    useState("86400000");

  const [warningLeadTime, setWarningLeadTime] =
    useState("21600000");

  const [gracePeriod, setGracePeriod] =
    useState("86400000");

  const [creating, setCreating] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function readJson(
    response: Response,
  ): Promise<Record<string, any>> {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async function createCapsule(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    const cleanEmail =
      beneficiaryEmail.trim().toLowerCase();

    if (!cleanTitle) {
      setError("Enter a capsule title.");
      return;
    }

    if (!cleanContent) {
      setError("Enter the capsule content.");
      return;
    }

    if (!cleanEmail) {
      setError("Enter the beneficiary email.");
      return;
    }

    const interval = Number(checkInInterval);
    const warning = Number(warningLeadTime);
    const grace = Number(gracePeriod);

    if (!Number.isFinite(interval) || interval <= 0) {
      setError("Invalid check-in interval.");
      return;
    }

    if (
      !Number.isFinite(warning) ||
      warning < 0 ||
      warning >= interval
    ) {
      setError(
        "Warning lead time must be smaller than the check-in interval.",
      );
      return;
    }

    if (!Number.isFinite(grace) || grace < 0) {
      setError("Invalid grace period.");
      return;
    }

    setCreating(true);

    try {
      /*
       * ----------------------------------------------------------
       * STEP 1
       * Resolve beneficiary identity.
       * ----------------------------------------------------------
       */

      const beneficiaryResponse =
        await fetch(
          `${API}/beneficiary/lookup?email=${encodeURIComponent(cleanEmail)}`,
          {
            credentials: "include",
          },
        );

      const beneficiaryData =
        await readJson(beneficiaryResponse);

      if (!beneficiaryResponse.ok) {
        throw new Error(
          beneficiaryData.error ||
            "Beneficiary could not be found.",
        );
      }

      const beneficiary =
        beneficiaryData.beneficiary as
          | BeneficiaryLookup
          | undefined;

      if (
        !beneficiary ||
        !beneficiary.userId ||
        !beneficiary.publicKey
      ) {
        throw new Error(
          "Beneficiary cryptographic identity is unavailable.",
        );
      }

      /*
       * ----------------------------------------------------------
       * STEP 2
       * Obtain owner's public identity.
       * ----------------------------------------------------------
       */

      const identityResponse =
        await fetch(`${API}/identity`, {
          credentials: "include",
        });

      const identityData =
        await readJson(identityResponse);

      if (
        !identityResponse.ok ||
        !identityData.configured ||
        typeof identityData.publicKey !== "string"
      ) {
        throw new Error(
          "Complete cryptographic identity setup before creating a capsule.",
        );
      }

      /*
       * ----------------------------------------------------------
       * STEP 3
       * Encrypt plaintext locally.
       *
       * Plaintext never goes to the API.
       * ----------------------------------------------------------
       */

      const encryptedResult =
        await encryptCapsuleContent(cleanContent);

      const encrypted =
        encryptedResult.encrypted;

      const dek = encryptedResult.dek;

      /*
       * ----------------------------------------------------------
       * STEP 4
       * Wrap DEK for owner.
       * ----------------------------------------------------------
       */

      const ownerWrapped =
        await wrapDekForRecipient(
          dek,
          identityData.publicKey,
          identityData.keyVersion ?? 1,
        );

      /*
       * ----------------------------------------------------------
       * STEP 5
       * Create encrypted DRAFT.
       * ----------------------------------------------------------
       */

      const createResponse =
        await fetch(`${API}/capsules`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: cleanTitle,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            cryptoVersion: encrypted.cryptoVersion,
            contentAlgorithm:
              encrypted.contentAlgorithm,
            ownerKeyEnvelope: {
              wrappedDek:
                ownerWrapped.wrappedDek,
              keyWrapAlgorithm:
                ownerWrapped.keyWrapAlgorithm,
              keyVersion:
                ownerWrapped.keyVersion,
            },
            checkInInterval: interval,
            warningLeadTime: warning,
            gracePeriod: grace,
          }),
        });

      const createData =
        await readJson(createResponse);

      if (!createResponse.ok) {
        throw new Error(
          createData.error ||
            "Failed to create encrypted capsule.",
        );
      }

      const capsuleId =
        createData?.capsule?._id ??
        createData?.capsule?.id;

      if (typeof capsuleId !== "string") {
        throw new Error(
          "Capsule ID was not returned by the API.",
        );
      }

      /*
       * ----------------------------------------------------------
       * STEP 6
       * Wrap the SAME DEK for beneficiary.
       * ----------------------------------------------------------
       */

      const beneficiaryWrapped =
        await wrapDekForRecipient(
          dek,
          beneficiary.publicKey,
          beneficiary.keyVersion,
        );

      /*
       * ----------------------------------------------------------
       * STEP 7
       * Store beneficiary + wrapped DEK.
       * ----------------------------------------------------------
       */

      const addBeneficiaryResponse =
        await fetch(
          `${API}/capsules/${capsuleId}/beneficiaries`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: beneficiary.userId,
              priority: 1,
              wrappedDek:
                beneficiaryWrapped.wrappedDek,
              keyWrapAlgorithm:
                beneficiaryWrapped.keyWrapAlgorithm,
              keyVersion:
                beneficiaryWrapped.keyVersion,
            }),
          },
        );

      const addBeneficiaryData =
        await readJson(
          addBeneficiaryResponse,
        );

      if (!addBeneficiaryResponse.ok) {
        throw new Error(
          addBeneficiaryData.error ||
            "Failed to add beneficiary.",
        );
      }

      /*
       * ----------------------------------------------------------
       * STEP 8
       * Activate only after beneficiary envelope exists.
       * ----------------------------------------------------------
       */

      const activateResponse =
        await fetch(
          `${API}/capsules/${capsuleId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              status: "ACTIVE",
            }),
          },
        );

      const activateData =
        await readJson(activateResponse);

      if (!activateResponse.ok) {
        throw new Error(
          activateData.error ||
            "Capsule could not be activated.",
        );
      }

      setSuccess(
        "Capsule encrypted and activated successfully.",
      );

      setTitle("");
      setContent("");
      setBeneficiaryEmail("");

      window.setTimeout(() => {
        onCreated();
      }, 900);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Capsule creation failed.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="card">
        <button
          type="button"
          onClick={onBack}
          className="secondary-button"
          disabled={creating}
        >
          ← Back
        </button>

        <h1>Create Capsule</h1>

        <p className="muted">
          Your secret is encrypted in your browser.
          CapsuleLink receives only ciphertext and
          encrypted key envelopes.
        </p>

        <form
          onSubmit={createCapsule}
          className="form-stack"
        >
          <label>
            Capsule title
            <input
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              maxLength={200}
              disabled={creating}
              placeholder="Emergency instructions"
            />
          </label>

          <label>
            Secret content
            <textarea
              value={content}
              onChange={(event) =>
                setContent(event.target.value)
              }
              disabled={creating}
              rows={10}
              placeholder="Write the information you want to protect..."
            />
          </label>

          <label>
            Beneficiary email
            <input
              type="email"
              value={beneficiaryEmail}
              onChange={(event) =>
                setBeneficiaryEmail(
                  event.target.value,
                )
              }
              disabled={creating}
              placeholder="beneficiary@example.com"
              autoComplete="email"
            />
          </label>

          <div className="form-grid">
            <label>
              Check-in interval (ms)
              <input
                type="number"
                min="1000"
                value={checkInInterval}
                onChange={(event) =>
                  setCheckInInterval(
                    event.target.value,
                  )
                }
                disabled={creating}
              />
            </label>

            <label>
              Warning lead time (ms)
              <input
                type="number"
                min="0"
                value={warningLeadTime}
                onChange={(event) =>
                  setWarningLeadTime(
                    event.target.value,
                  )
                }
                disabled={creating}
              />
            </label>

            <label>
              Grace period (ms)
              <input
                type="number"
                min="0"
                value={gracePeriod}
                onChange={(event) =>
                  setGracePeriod(
                    event.target.value,
                  )
                }
                disabled={creating}
              />
            </label>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="primary-button"
          >
            {creating
              ? "Encrypting and activating..."
              : "Encrypt & Activate Capsule"}
          </button>
        </form>
      </section>
    </main>
  );
}
