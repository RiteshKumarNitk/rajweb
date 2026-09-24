export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  VERIFY_CERTIFICATE: "/verify",
  PUBLIC_TOURNAMENTS: "/tournaments",
  PUBLIC_COACHES: "/coaches",
  PUBLIC_CLUBS: "/clubs",
  PUBLIC_ACADEMIES: "/academies",

  // Player Dashboard
  PLAYER: {
    DASHBOARD: "/dashboard/player",
    PROFILE: "/dashboard/player/profile",
    TOURNAMENTS: "/dashboard/player/tournaments",
    CERTIFICATES: "/dashboard/player/certificates",
  },

  // Admin Dashboard
  ADMIN: {
    DASHBOARD: "/admin",
    USERS: "/admin/users",
    PLAYERS: "/admin/players",
    COACHES: "/admin/coaches",
    TOURNAMENTS: "/admin/tournaments",
    MEMBERSHIPS: "/admin/memberships",
    CERTIFICATES: "/admin/certificates",
    EQUIPMENT_ORDERS: "/admin/equipment-orders",
    AUDIT_LOGS: "/admin/audit-logs",
    SETTINGS: "/admin/settings",
  },
} as const;
