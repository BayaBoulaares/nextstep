export interface UserAdminDTO {
  keycloakId: string;
  username: string;
  email: string;
  role: string;
  enabled: boolean;
  isOnline: boolean;          // session Keycloak active
  suspensionReason: string | null;
  suspendedBy: string | null;
  suspendedAt: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;             // page courante
}