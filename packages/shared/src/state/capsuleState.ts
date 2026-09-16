import type { CapsuleStatus } from '../index.js';

export const CAPSULE_STATUSES: CapsuleStatus[] = [
  'DRAFT',
  'ACTIVE',
  'WARNING',
  'GRACE',
  'RELEASING',
  'RELEASED',
  'CANCELLED',
]

export const TERMINAL_CAPSULE_STATUSES: CapsuleStatus[] = [
  'RELEASED',
  'CANCELLED',
]

export const canCheckIn = (status: CapsuleStatus): boolean => {
  return status !== 'RELEASED' && status !== 'CANCELLED'
}

export const canCancel = (status: CapsuleStatus): boolean => {
  return status !== 'RELEASED' && status !== 'CANCELLED'
}

export const canStartRelease = (status: CapsuleStatus): boolean => {
  return status === 'GRACE'
}

export const canCompleteRelease = (status: CapsuleStatus): boolean => {
  return status === 'RELEASING'
}

export const isTerminalStatus = (status: CapsuleStatus): boolean => {
  return TERMINAL_CAPSULE_STATUSES.includes(status)
}