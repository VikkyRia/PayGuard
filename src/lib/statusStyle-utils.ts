

export const statusColors: Record<string, string> = {
  pending_payment: "bg-muted text-muted-foreground",
  funded: "bg-primary/15 text-primary border border-primary/30",
  shipped: "bg-secondary/15 text-secondary border border-secondary/30",
  delivered: "bg-secondary/20 text-secondary border border-secondary/30",
  inspection: "bg-accent/20 text-accent border border-accent/30",
  completed: "bg-[hsl(160,60%,45%)]/15 text-[hsl(160,60%,45%)] border border-[hsl(160,60%,45%)]/30",
  disputed: "bg-destructive/15 text-destructive border border-destructive/30",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export const disputeStatusColors: Record<string, string> = {
  pending_evidence: "bg-muted text-muted-foreground",
  under_review: "bg-secondary/15 text-secondary border border-secondary/30",
  auto_resolved: "bg-primary/15 text-primary border border-primary/30",
  resolved_buyer: "bg-[hsl(160,60%,45%)]/15 text-[hsl(160,60%,45%)]",
  resolved_seller: "bg-[hsl(160,60%,45%)]/15 text-[hsl(160,60%,45%)]",
  escalated: "bg-destructive/15 text-destructive border border-destructive/30",
};

