import { User } from "./User.js";
import { Capsule } from "./Capsule.js";
import { CapsuleKeyEnvelope } from "./CapsuleKeyEnvelope.js";
import { Beneficiary } from "./Beneficiary.js";
import { Release } from "./Release.js";
import { Session } from "./Session.js";
import { EmailVerification } from "./EmailVerification.js";

export function configureModelIndexes(): void {
  User.schema.index(
    {
      email: 1,
    },
    {
      unique: true,
    },
  );

  Capsule.schema.index({
    ownerId: 1,
    status: 1,
  });

  Capsule.schema.index({
    nextCheckInAt: 1,
    status: 1,
  });

  Capsule.schema.index({
    graceEndsAt: 1,
    status: 1,
  });

  CapsuleKeyEnvelope.schema.index(
    {
      capsuleId: 1,
      recipientUserId: 1,
    },
    {
      unique: true,
    },
  );

  Beneficiary.schema.index({
    capsuleId: 1,
    priority: 1,
  });

  Beneficiary.schema.index({
    userId: 1,
  });

  Release.schema.index({
    status: 1,
    createdAt: 1,
  });

  Session.schema.index({
    userId: 1,
    expiresAt: 1,
  });

  EmailVerification.schema.index({
    userId: 1,
    expiresAt: 1,
  });
}
