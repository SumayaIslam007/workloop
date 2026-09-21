export const UserRole = {
  BUYER: 'buyer',
  TECHNICIAN: 'technician',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Roles a person can choose when signing up. Admins are created out of band. */
export const SELF_REGISTRATION_ROLES = [UserRole.BUYER, UserRole.TECHNICIAN] as const;

export type SelfRegistrationRole = (typeof SELF_REGISTRATION_ROLES)[number];
