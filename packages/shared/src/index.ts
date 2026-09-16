export type CapsuleStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'WARNING'
  | 'GRACE'
  | 'RELEASING'
  | 'RELEASED'
  | 'CANCELLED'

export type BeneficiaryStatus =
  | 'PENDING'
  | 'INVITED'
  | 'ENROLLED'
  | 'AUTHORIZED'
  | 'NOTIFIED'
  | 'ACCESS_STARTED'
  | 'VIEWED'
  | 'ACKNOWLEDGED'
  | 'TIMEOUT'

export type JobType =
  | 'CAPSULE_WARNING'
  | 'CAPSULE_RELEASE'
  | 'BENEFICIARY_NOTIFICATION'
  | 'BENEFICIARY_ESCALATION'
  | 'EMAIL_DELIVERY'