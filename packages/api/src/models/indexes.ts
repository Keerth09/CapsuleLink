import { Capsule } from "./Capsule.js";
import { Beneficiary } from "./Beneficiary.js";
import { Release } from "./Release.js";
import { Session } from "./Session.js";
import { User } from "./User.js";
import { EmailVerification } from "./EmailVerification.js";

export function configureModelIndexes(): void {


  Capsule.schema.index({ ownerId: 1, status: 1 });
  Capsule.schema.index({ status: 1, nextCheckInAt: 1 });
  Capsule.schema.index({ status: 1, graceEndsAt: 1 });

  Beneficiary.schema.index({ capsuleId: 1, status: 1 });

  Release.schema.index({ status: 1, createdAt: 1 });

  Session.schema.index({ userId: 1, expiresAt: 1 });

  EmailVerification.schema.index({ userId: 1, expiresAt: 1 });
}