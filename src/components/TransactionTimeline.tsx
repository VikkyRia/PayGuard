import {
  Clock,
  Truck,
  PackageCheck,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

const statusTimeline = [
  {
    status: "pending_payment",
    label: "Awaiting Payment",
    icon: Clock,
    color: "text-muted-foreground",
  },
  {
    status: "funded",
    label: "Payment Received",
    icon: Banknote,
    color: "text-primary",
  },
  {
    status: "shipped",
    label: "Item Shipped",
    icon: Truck,
    color: "text-secondary",
  },
  {
    status: "delivered",
    label: "Delivered",
    icon: PackageCheck,
    color: "text-secondary",
  },
  {
    status: "inspection",
    label: "Inspection Period",
    icon: ShieldCheck,
    color: "text-accent",
  },
  {
    status: "completed",
    label: "Completed",
    icon: CheckCircle2,
    color: "text-[hsl(160,60%,45%)]",
  },
];

const statusOrder = [
  "pending_payment",
  "funded",
  "shipped",
  "delivered",
  "inspection",
  "completed",
];

interface Props {
  status: string;
  inspectionDeadline?: string;
}

export function TransactionTimeline({ status, inspectionDeadline }: Props) {
  const currentStatusIndex = statusOrder.indexOf(status);
  const isDisputed = status === "disputed";
  const isCancelled = ["cancelled", "refunded"].includes(status);

  return (
    <div className="bg-card rounded-2xl p-6 border border-border mb-6">
      <h2 className="font-display text-lg font-bold text-foreground mb-6">
        Transaction Timeline
      </h2>

      {isDisputed && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-destructive">
              Transaction Disputed
            </p>
            <p className="text-xs text-muted-foreground">
              This transaction is under review. Our team will resolve within 24
              hours.
            </p>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-muted border border-border rounded-xl p-4 mb-6 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-semibold text-foreground">
              Transaction {status === "refunded" ? "Refunded" : "Cancelled"}
            </p>
            <p className="text-xs text-muted-foreground">
              This transaction has been closed.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-0">
        {statusTimeline.map((step, i) => {
          const isReached = currentStatusIndex >= i;
          const isCurrent = statusOrder[currentStatusIndex] === step.status;
          const Icon = step.icon;

          return (
            <div key={step.status} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/15 scale-110"
                      : isReached
                        ? "border-primary/50 bg-primary/10"
                        : "border-border bg-muted"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isReached ? step.color : "text-muted-foreground/50"}`}
                  />
                </div>
                {i < statusTimeline.length - 1 && (
                  <div
                    className={`w-0.5 h-8 ${isReached ? "bg-primary/30" : "bg-border"}`}
                  />
                )}
              </div>
              <div className="pb-6">
                <p
                  className={`font-medium text-sm ${isReached ? "text-foreground" : "text-muted-foreground/50"}`}
                >
                  {step.label}
                </p>
                {isCurrent &&
                  step.status === "inspection" &&
                  inspectionDeadline && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Expires:{" "}
                      {new Date(inspectionDeadline).toLocaleString("en-NG")}
                    </p>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
