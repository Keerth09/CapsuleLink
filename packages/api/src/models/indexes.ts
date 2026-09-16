import { Capsule } from "./Capsule.js";
import { Beneficiary } from "./Beneficiary.js";
import { Release } from "./Release.js";

export function configureModelIndexes(): void {
  Capsule.schema.index({ ownerId: 1, status: 1 });
  Capsule.schema.index({ status: 1, nextCheckInAt: 1 });
  Capsule.schema.index({ status: 1, graceEndsAt: 1 });

  Beneficiary.schema.index({ capsuleId: 1, status: 1 });

  Release.schema.index({ status: 1, createdAt: 1 });
}
