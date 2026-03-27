import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Package,
  ShieldAlert,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBuyerDashboardData } from "@/hooks/useBuyerDashboardData";
import { useTransactionActions } from "@/hooks/useTransactionActions";
import { transactionService } from "@/services/transaction.service";
import { statusColors } from "@/lib/statusStyle-utils";
import { InspectionTimer } from "@/components/InspectionTimer";
import Navbar from "@/components/Dashboarad-nav";
import { toast } from "sonner";


const STATUS_STEPS = [
  "pending_payment",
  "funded",
  "shipped",
  "delivered",
  "inspection",
  "completed",
] as const;

function StatusStepper({ current }: { current: string }) {
  const labels: Record<string, string> = {
    pending_payment: "Payment",
    funded: "Paid",
    shipped: "Shipped",
    delivered: "Delivered",
    inspection: "Inspection",
    completed: "Complete",
  };

  const currentIdx = STATUS_STEPS.indexOf(current as any);

  return (
    <div className="flex items-center gap-0 w-full mt-2">
      {STATUS_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-2.5 h-2.5 rounded-full border transition-colors ${
                  done
                    ? "bg-green-500 border-green-500"
                    : active
                      ? "bg-primary border-primary"
                      : "bg-muted border-border"
                }`}
              />
              <span
                className={`text-[9px] mt-0.5 whitespace-nowrap ${
                  active
                    ? "text-foreground font-medium"
                    : done
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                }`}
              >
                {labels[step] ?? step}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-1 mb-3 transition-colors ${
                  done ? "bg-green-500" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BuyerStatsRow({ transactions }: { transactions: any[] }) {
  const active = transactions.filter(
    (t) => !["completed", "refunded", "cancelled"].includes(t.status),
  ).length;
  const completed = transactions.filter((t) => t.status === "completed").length;
  const inEscrow = transactions
    .filter((t) =>
      ["funded", "shipped", "inspection", "delivered"].includes(t.status),
    )
    .reduce((a, t) => a + Number(t.amount), 0);

  const stats = [
    {
      label: "In escrow",
      value: `₦${inEscrow.toLocaleString()}`,
      sub: "protected",
    },
    { label: "Active", value: String(active), sub: "in progress" },
    { label: "Completed", value: String(completed), sub: "settled" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-8">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-card rounded-xl p-4 border border-border"
        >
          <p className="text-[10px] text-muted-foreground uppercase font-medium">
            {s.label}
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-1">{s.value}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

function DisputeModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-bold text-lg mb-1">Raise a dispute</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Provide details about the issue with this order.
        </p>
        <textarea
          className="w-full rounded-xl border border-border bg-background p-3 text-sm h-28 focus:ring-2 focus:ring-primary outline-none"
          placeholder="e.g. Item is damaged or not as described..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 10}
            onClick={() => onSubmit(reason.trim())}
          >
            Submit Dispute
          </Button>
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  tx,
  userId,
  onUpdated,
}: {
  tx: any;
  userId: string;
  onUpdated: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const actions = useTransactionActions(onUpdated);
  const [showDispute, setShowDispute] = useState(false);

  const handleAutoComplete = async () => {
    try {
      const result = await transactionService.autoCompleteIfExpired(tx.id);
      if (result) {
        await onUpdated();
        toast.success("Inspection period ended. Funds released.");
      }
    } catch (err) {
      console.error("Auto-complete error:", err);
    }
  };

  const isTerminal = ["completed", "refunded", "cancelled"].includes(tx.status);

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-4 shadow-sm hover:shadow-md transition-shadow">
      {showDispute && (
        <DisputeModal
          onClose={() => setShowDispute(false)}
          onSubmit={async (reason) => {
            setShowDispute(false);
            await actions.raiseDispute(tx.id, userId, reason);
          }}
        />
      )}

      <div className="flex justify-between items-start">
        <div
          className="cursor-pointer flex-1"
          onClick={() => navigate(`/transaction/${tx.id}`)}
        >
          <h4 className="font-semibold truncate">{tx.item_name}</h4>
          <p className="text-xs font-mono text-muted-foreground uppercase">
            {tx.reference_code}
          </p>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[tx.status] || ""}`}
        >
          {tx.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="text-xl font-bold">
            ₦{Number(tx.amount).toLocaleString()}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {new Date(tx.created_at).toLocaleDateString()}
        </p>
      </div>

      {!isTerminal && <StatusStepper current={tx.status} />}

      {tx.status === "inspection" && tx.inspection_deadline && (
        <InspectionTimer
          deadline={tx.inspection_deadline}
          onExpired={handleAutoComplete}
        />
      )}

      <div className="flex gap-2 pt-2">
        {tx.status === "shipped" && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => actions.confirmReceipt(tx.id)}
            disabled={actions.loading}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Received
          </Button>
        )}
        {tx.status === "inspection" && (
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => actions.confirmDelivery(tx.id)}
            disabled={actions.loading}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Accept & Release
          </Button>
        )}
        {!isTerminal && tx.status !== "pending_payment" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDispute(true)}
            disabled={actions.loading}
          >
            <ShieldAlert className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate(`/transaction/${tx.id}`)}
        >
          Details
        </Button>
      </div>
    </div>
  );
}

const BuyerDashboard = () => {
  const { user, isAdmin, loading, userType } = useAuth();
  const {
    transactions,
    loading: dataLoading,
    refresh,
  } = useBuyerDashboardData();
  const [activeTab, setActiveTab] = useState<
    "all" | "active" | "completed" | "disputed"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Use useMemo to filter only when needed
  const visibleTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        t.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.reference_code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "active" &&
          !["completed", "refunded", "cancelled"].includes(t.status)) ||
        (activeTab === "completed" &&
          ["completed", "refunded"].includes(t.status)) ||
        (activeTab === "disputed" && t.status === "disputed");

      return matchesSearch && matchesTab;
    });
  }, [transactions, activeTab, searchQuery]);

  if (loading) return <div className="p-10 text-center">Authenticating...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (userType === "seller") return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email || ""} isAdmin={isAdmin} />
      <main className="max-w-4xl mx-auto p-4 sm:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">
            My Purchases
          </h1>
          <p className="text-muted-foreground">
            Securely managing your active escrow payments.
          </p>
        </header>

        <BuyerStatsRow transactions={transactions} />

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex p-1 bg-muted rounded-lg w-fit">
            {(["all", "active", "completed", "disputed"] as const).map(
              (tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-xs font-semibold capitalize rounded-md transition-all ${activeTab === tab ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                >
                  {tab}
                </button>
              ),
            )}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search items or codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {dataLoading ? (
          <div className="grid gap-4">
            <div className="h-32 w-full bg-muted animate-pulse rounded-xl" />
          </div>
        ) : visibleTransactions.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="font-medium">No transactions found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleTransactions.map((tx) => (
              <OrderCard
                key={tx.id}
                tx={tx}
                userId={user.id}
                onUpdated={refresh}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BuyerDashboard;
