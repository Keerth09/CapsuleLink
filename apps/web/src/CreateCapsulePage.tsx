
import { useState, type FormEvent } from "react";

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

type TimeUnit = "hours" | "days" | "months";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonObject = { [key: string]: JsonValue };

const API = "/api/v1";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;

function durationToMs(value: string, unit: TimeUnit): number {
  const amount = Number(value);

  const multiplier =
    unit === "hours"
      ? HOUR_MS
      : unit === "days"
        ? DAY_MS
        : MONTH_MS;

  return amount * multiplier;
}

async function readJson(response: Response): Promise<JsonObject> {
  try {
    const data: unknown = await response.json();

    if (
      data !== null &&
      typeof data === "object" &&
      !Array.isArray(data)
    ) {
      return data as JsonObject;
    }

    return {};
  } catch {
    return {};
  }
}

function getString(
  object: JsonObject,
  key: string,
): string | undefined {
  const value = object[key];
  return typeof value === "string" ? value : undefined;
}

function getNestedString(
  object: JsonObject,
  parent: string,
  key: string,
): string | undefined {
  const value = object[parent];

  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return undefined;
  }

  const nestedValue = value[key];

  return typeof nestedValue === "string"
    ? nestedValue
    : undefined;
}

export default function CreateCapsulePage({
  onBack,
  onCreated,
}: CreateCapsulePageProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [emails, setEmails] = useState(["", "", ""]);

  const [intervalValue, setIntervalValue] = useState("30");
  const [intervalUnit, setIntervalUnit] =
    useState<TimeUnit>("days");

  const [warningValue, setWarningValue] = useState("3");
  const [warningUnit, setWarningUnit] =
    useState<TimeUnit>("days");

  const [graceValue, setGraceValue] = useState("2");
  const [graceUnit, setGraceUnit] =
    useState<TimeUnit>("days");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateEmail(index: number, value: string) {
    setEmails((current) =>
      current.map((email, i) => (i === index ? value : email)),
    );
  }

  async function createCapsule(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    const cleanEmails = emails.map((email) =>
      email.trim().toLowerCase(),
    );

    if (!cleanTitle || !cleanContent) {
      setError("Enter a capsule title and secret content.");
      return;
    }

    if (cleanEmails.some((email) => !email)) {
      setError("Enter all three beneficiary email addresses.");
      return;
    }

    if (new Set(cleanEmails).size !== 3) {
      setError("Each beneficiary must have a different email address.");
      return;
    }

    const interval = durationToMs(intervalValue, intervalUnit);
    const warning = durationToMs(warningValue, warningUnit);
    const grace = durationToMs(graceValue, graceUnit);

    if (!Number.isSafeInteger(interval) || interval <= 0) {
      setError("The inactivity period must be greater than zero.");
      return;
    }

    if (
      !Number.isSafeInteger(warning) ||
      warning < 0 ||
      warning >= interval
    ) {
      setError(
        "Warning lead time must be non-negative and shorter than the inactivity period.",
      );
      return;
    }

    if (!Number.isSafeInteger(grace) || grace < 0) {
      setError("The grace period must be zero or greater.");
      return;
    }

    setCreating(true);

    try {
      // Step 1: Resolve all three beneficiary identities.
      const beneficiaries: BeneficiaryLookup[] = [];

      for (const email of cleanEmails) {
        const response = await fetch(
          `${API}/beneficiary/lookup?email=${encodeURIComponent(email)}`,
          { credentials: "include" },
        );

        const data = await readJson(response);

        if (!response.ok) {
          throw new Error(
            `${email}: ${
              getString(data, "error") ??
              "Beneficiary lookup failed."
            }`,
          );
        }

        const rawBeneficiary = data.beneficiary;

        if (
          rawBeneficiary === null ||
          typeof rawBeneficiary !== "object" ||
          Array.isArray(rawBeneficiary)
        ) {
          throw new Error(
            `Beneficiary details were not returned for ${email}.`,
          );
        }

        const userId = getString(rawBeneficiary, "userId");
        const publicKey = getString(rawBeneficiary, "publicKey");
        const beneficiaryEmail = getString(rawBeneficiary, "email");
        const keyVersion = rawBeneficiary.keyVersion;

        if (
          !userId ||
          !publicKey ||
          typeof keyVersion !== "number" ||
          !Number.isFinite(keyVersion)
        ) {
          throw new Error(
            `Cryptographic identity is unavailable for ${email}.`,
          );
        }

        beneficiaries.push({
          userId,
          email: beneficiaryEmail ?? email,
          publicKey,
          keyVersion,
        });
      }

      if (
        new Set(beneficiaries.map((beneficiary) => beneficiary.userId))
          .size !== 3
      ) {
        throw new Error(
          "Each priority must belong to a different user.",
        );
      }

      // Step 2: Obtain the owner's public identity.
      const identityResponse = await fetch(`${API}/identity`, {
        credentials: "include",
      });

      const identity = await readJson(identityResponse);

      if (
        !identityResponse.ok ||
        identity.configured !== true ||
        typeof identity.publicKey !== "string"
      ) {
        throw new Error(
          "Complete cryptographic identity setup before creating a capsule.",
        );
      }

      const ownerPublicKey = identity.publicKey;
      const ownerKeyVersion =
        typeof identity.keyVersion === "number"
          ? identity.keyVersion
          : 1;

      // Step 3: Encrypt the secret in the browser.
      // Plaintext is never sent to the API.
      const encryptedResult =
        await encryptCapsuleContent(cleanContent);

      const encrypted = encryptedResult.encrypted;
      const dek = encryptedResult.dek;

      // Step 4: Wrap the encryption key for the owner.
      const ownerWrapped = await wrapDekForRecipient(
        dek,
        ownerPublicKey,
        ownerKeyVersion,
      );

      // Step 5: Create the encrypted draft.
      const createResponse = await fetch(`${API}/capsules`, {
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
          contentAlgorithm: encrypted.contentAlgorithm,
          ownerKeyEnvelope: {
            wrappedDek: ownerWrapped.wrappedDek,
            keyWrapAlgorithm: ownerWrapped.keyWrapAlgorithm,
            keyVersion: ownerWrapped.keyVersion,
          },
          checkInInterval: interval,
          warningLeadTime: warning,
          gracePeriod: grace,
        }),
      });

      const created = await readJson(createResponse);

      if (!createResponse.ok) {
        throw new Error(
          getString(created, "error") ??
            "Failed to create encrypted capsule.",
        );
      }

      const capsuleId =
        getNestedString(created, "capsule", "_id") ??
        getNestedString(created, "capsule", "id");

      if (!capsuleId) {
        throw new Error("Capsule ID was not returned by the API.");
      }

      // Step 6: Wrap the same DEK for each beneficiary.
      // Priority 1 is first, then 2, then 3.
      for (let index = 0; index < beneficiaries.length; index += 1) {
        const beneficiary = beneficiaries[index];

        const wrapped = await wrapDekForRecipient(
          dek,
          beneficiary.publicKey,
          beneficiary.keyVersion,
        );

        const addResponse = await fetch(
          `${API}/capsules/${capsuleId}/beneficiaries`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: beneficiary.userId,
              priority: index + 1,
              wrappedDek: wrapped.wrappedDek,
              keyWrapAlgorithm: wrapped.keyWrapAlgorithm,
              keyVersion: wrapped.keyVersion,
            }),
          },
        );

        const addData = await readJson(addResponse);

        if (!addResponse.ok) {
          throw new Error(
            `Could not add priority ${index + 1} beneficiary: ${
              getString(addData, "error") ?? "Request failed."
            }`,
          );
        }
      }

      // Step 7: Activate only after all three recipients are added.
      const activateResponse = await fetch(
        `${API}/capsules/${capsuleId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "ACTIVE" }),
        },
      );

      const activated = await readJson(activateResponse);

      if (!activateResponse.ok) {
        throw new Error(
          getString(activated, "error") ??
            "Capsule could not be activated.",
        );
      }

      setSuccess(
        "Capsule encrypted and activated with three beneficiaries in priority order.",
      );

      setTitle("");
      setContent("");
      setEmails(["", "", ""]);

      window.setTimeout(() => {
        onCreated();
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
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
          Your secret is encrypted in your browser. CapsuleLink receives
          only ciphertext and encrypted key envelopes.
        </p>

        <form onSubmit={createCapsule} className="form-stack">
          <label>
            Capsule title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              disabled={creating}
              placeholder="Emergency instructions"
              required
            />
          </label>

          <label>
            Secret content
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={creating}
              rows={10}
              placeholder="Write the information you want to protect..."
              required
            />
          </label>

          <h2>Beneficiaries</h2>

          <p className="muted">
            Use three registered CapsuleLink users. Priority 1 is first,
            followed by priority 2 and priority 3. The backend must enforce
            this order during release.
          </p>

          {emails.map((email, index) => (
            <label key={index}>
              Beneficiary {index + 1} email — Priority {index + 1}
              <input
                type="email"
                value={email}
                onChange={(event) =>
                  updateEmail(index, event.target.value)
                }
                disabled={creating}
                placeholder={`beneficiary${index + 1}@example.com`}
                autoComplete="email"
                required
              />
            </label>
          ))}

          <h2>Inactivity schedule</h2>

          <p className="muted">
            A check-in resets the inactivity timer. One month is treated as
            30 days.
          </p>

          <div className="form-grid">
            <label>
              Inactivity period
              <input
                type="number"
                min="1"
                step="1"
                value={intervalValue}
                onChange={(event) =>
                  setIntervalValue(event.target.value)
                }
                disabled={creating}
                required
              />
              <select
                value={intervalUnit}
                onChange={(event) =>
                  setIntervalUnit(event.target.value as TimeUnit)
                }
                disabled={creating}
              >
                <option value="days">Days</option>
                <option value="months">Months (30 days each)</option>
                <option value="hours">Hours</option>
              </select>
            </label>

            <label>
              Owner warning lead time
              <input
                type="number"
                min="0"
                step="1"
                value={warningValue}
                onChange={(event) =>
                  setWarningValue(event.target.value)
                }
                disabled={creating}
                required
              />
              <select
                value={warningUnit}
                onChange={(event) =>
                  setWarningUnit(event.target.value as TimeUnit)
                }
                disabled={creating}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </label>

            <label>
              Grace period after deadline
              <input
                type="number"
                min="0"
                step="1"
                value={graceValue}
                onChange={(event) =>
                  setGraceValue(event.target.value)
                }
                disabled={creating}
                required
              />
              <select
                value={graceUnit}
                onChange={(event) =>
                  setGraceUnit(event.target.value as TimeUnit)
                }
                disabled={creating}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
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
