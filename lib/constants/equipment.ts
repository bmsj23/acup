export const EQUIPMENT_STATUSES = ["active", "idle", "maintenance"] as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  active: "Active",
  idle: "Idle",
  maintenance: "Maintenance",
};
