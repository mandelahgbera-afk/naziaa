export const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "New · to pack",
  packed: "Packed",
  assigned: "Rider assigned",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  failed: "Delivery failed",
  returned: "Returned",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const STATUS_TONE: Record<string, string> = {
  pending_payment: "bg-[#efe9e2] text-muted",
  paid: "bg-[#f8e3c4] text-[#7a4510]",
  packed: "bg-[#efe6ef] text-[#5b4a70]",
  assigned: "bg-[#e3ecf3] text-[#2f5269]",
  out_for_delivery: "bg-[#dfeee4] text-[#2f6040]",
  delivered: "bg-[#e6efdc] text-[#46613a]",
  failed: "bg-[#f6dcd5] text-[#7a2e12]",
  returned: "bg-[#efe9e2] text-ink-soft",
  cancelled: "bg-[#efe9e2] text-muted",
  refunded: "bg-[#efe9e2] text-muted",
};

/** Mirrors public.order_transition_allowed in the database. */
export const NEXT_STATUSES: Record<string, string[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["packed", "cancelled", "refunded"],
  packed: ["assigned", "cancelled"],
  assigned: ["out_for_delivery", "packed"],
  out_for_delivery: ["delivered", "failed"],
  failed: ["assigned", "returned"],
  delivered: ["returned"],
  returned: ["refunded"],
  cancelled: [],
  refunded: [],
};

export const BOARD_COLUMNS = ["paid", "packed", "assigned", "out_for_delivery"] as const;
