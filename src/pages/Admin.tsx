import { useAuth } from "@/contexts/useAuth";
import { Navigate, Link } from "react-router-dom";
import {
  LogOut,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import WithdrawalManagement from "@/components/admin/WithdrawalManagement";
import { useAdminData, type DisputeStatus } from "@/hooks/useAdminData";

// Status colour maps

const statusColors: Record<string, string> = {
  pending_payment: "bg-muted text-muted-foreground",
  funded: "bg-primary/15 text-primary border border-primary/30",
  shipped: "bg-secondary/15 text-secondary border border-secondary/30",
  delivered: "bg-secondary/20 text-secondary border border-secondary/30",
  inspection: "bg-accent/20 text-accent border border-accent/30",
  completed:
    "bg-[hsl(160,60%,45%)]/15 text-[hsl(160,60%,45%)] border border-[hsl(160,60%,45%)]/30",
  disputed: "bg-destructive/15 text-destructive border border-destructive/30",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const disputeStatusColors: Record<string, string> = {
  pending_evidence: "bg-muted text-muted-foreground",
  under_review: "bg-secondary/15 text-secondary border border-secondary/30",
  auto_resolved: "bg-primary/15 text-primary border border-primary/30",
  resolved_buyer: "bg-[hsl(160,60%,45%)]/15 text-[hsl(160,60%,45%)]",
  resolved_seller: "bg-[hsl(160,60%,45%)]/15 text-[hsl(160,60%,45%)]",
  escalated: "bg-destructive/15 text-destructive border border-destructive/30",
};

const RESOLVED_STATUSES = [
  "auto_resolved",
  "resolved_buyer",
  "resolved_seller",
];

// Sub-components

function StatCards({
  transactions,
  disputes,
  withdrawals,
  profiles,
}: {
  transactions: any[];
  disputes: any[];
  withdrawals: any[];
  profiles: any[];
}) {
  const stats = [
    {
      label: "Total Transactions",
      value: transactions.length,
      sub: "all time",
    },
    {
      label: "Active Disputes",
      value: disputes.filter((d) => !RESOLVED_STATUSES.includes(d.status))
        .length,
      sub: "require attention",
      neg: true,
    },
    {
      label: "Pending Withdrawals",
      value: withdrawals.filter(
        (w) => w.status === "pending" || w.status === "processing",
      ).length,
      sub: "awaiting action",
      neg: true,
    },
    { label: "Total Users", value: profiles.length, sub: "registered" },
    {
      label: "KYC Verified",
      value: profiles.filter((p) => p.bvn_verified || p.nin_verified).length,
      sub: "verified users",
    },
  ];

  return (
    <div className="grid sm:grid-cols-5 gap-4 mb-8">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-card rounded-xl p-5 border border-border"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {s.label}
          </p>
          <p className="font-display text-2xl font-extrabold text-foreground mt-2">
            {s.value}
          </p>
          <p
            className={`text-xs mt-1 ${s.neg ? "text-destructive" : "text-[hsl(160,60%,45%)]"}`}
          >
            {s.sub}
          </p>
        </div>
      ))}
    </div>
  );
}

function TransactionsTab({
  transactions,
  loading,
}: {
  transactions: any[];
  loading: boolean;
}) {
  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (transactions.length === 0)
    return (
      <div className="bg-card rounded-xl p-8 border border-border text-center text-muted-foreground">
        No transactions yet.
      </div>
    );

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Ref", "Item", "Amount", "Status", "Date"].map((h) => (
                <th
                  key={h}
                  className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-t border-border hover:bg-muted/20 transition-colors"
              >
                <td className="p-3 font-mono text-xs text-muted-foreground">
                  {tx.reference_code}
                </td>
                <td className="p-3 font-medium text-foreground">
                  {tx.item_name}
                </td>
                <td className="p-3 font-display font-bold text-foreground">
                  ₦{Number(tx.amount).toLocaleString()}
                </td>
                <td className="p-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[tx.status] ?? ""}`}
                  >
                    {tx.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground text-xs">
                  {new Date(tx.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DisputesTab({
  disputes,
  loading,
  onUpdateStatus,
}: {
  disputes: any[];
  loading: boolean;
  onUpdateStatus: (id: string, status: DisputeStatus) => Promise<void>;
}) {
  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (disputes.length === 0)
    return (
      <div className="bg-card rounded-xl p-8 border border-border text-center text-muted-foreground">
        No disputes yet.
      </div>
    );

  return (
    <div className="space-y-4">
      {disputes.map((d) => (
        <div key={d.id} className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-display font-bold text-foreground">
                {d.transactions?.item_name ?? "Unknown Item"} — ₦
                {Number(d.transactions?.amount ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                Ref: {d.transactions?.reference_code}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${disputeStatusColors[d.status] ?? ""}`}
              >
                {d.status.replace(/_/g, " ")}
              </span>
              <Badge variant="outline" className="text-xs border-border">
                {d.tier.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{d.reason}</p>
          {!RESOLVED_STATUSES.includes(d.status) && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(d.id, "resolved_buyer")}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve for Buyer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(d.id, "resolved_seller")}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve for Seller
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(d.id, "escalated")}
              >
                <AlertTriangle className="h-4 w-4 mr-1" /> Escalate
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function UsersTab({
  profiles,
  loading,
}: {
  profiles: any[];
  loading: boolean;
}) {
  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {[
                "Name",
                "Email",
                "Trust Score",
                "KYC",
                "Transactions",
                "Disputes",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr
                key={p.id}
                className="border-t border-border hover:bg-muted/20 transition-colors"
              >
                <td className="p-3 font-medium text-foreground">
                  {p.display_name}
                </td>
                <td className="p-3 text-muted-foreground">{p.email}</td>
                <td className="p-3 font-display font-bold text-foreground">
                  {Number(p.trust_score).toFixed(1)}
                </td>
                <td className="p-3">
                  {p.bvn_verified || p.nin_verified ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-[hsl(160,60%,45%)]" />
                      <span className="text-xs text-muted-foreground">
                        {p.bvn_verified ? "BVN" : "NIN"}
                      </span>
                    </span>
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </td>
                <td className="p-3">{p.total_transactions}</td>
                <td className="p-3">{p.total_disputes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Page

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const {
    transactions,
    disputes,
    profiles,
    withdrawals,
    loading: dataLoading,
    refresh,
    updateDisputeStatus,
  } = useAdminData();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/85 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="font-display text-xl font-extrabold text-foreground"
            >
              Pay<span className="text-primary">Guard</span>
            </Link>
            <Badge
              variant="outline"
              className="text-xs text-primary border-primary/30"
            >
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-extrabold text-foreground mb-6">
          Admin Dashboard
        </h1>

        <StatCards
          transactions={transactions}
          disputes={disputes}
          withdrawals={withdrawals}
          profiles={profiles}
        />

        <Tabs defaultValue="transactions">
          <TabsList className="bg-muted border border-border">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4">
            <TransactionsTab
              transactions={transactions}
              loading={dataLoading}
            />
          </TabsContent>

          <TabsContent value="disputes" className="mt-4">
            <DisputesTab
              disputes={disputes}
              loading={dataLoading}
              onUpdateStatus={updateDisputeStatus}
            />
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-4">
            <WithdrawalManagement
              withdrawals={withdrawals}
              loading={dataLoading}
              onRefresh={refresh}
            />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <UsersTab profiles={profiles} loading={dataLoading} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
