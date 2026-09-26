export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: import('@jeddah/shared').UserRole;
  status: import('@jeddah/shared').UserStatus;
}
