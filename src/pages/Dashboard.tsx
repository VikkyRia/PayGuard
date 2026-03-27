import { useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { Navigate, Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  User,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  Wallet,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateTransactionForm from "@/components/CreateTransactionForm";
import EditTransactionForm from "@/components/EditTransactionForm";
import TransactionActions from "@/components/TransactionActions";
import KYCVerification from "@/components/KYCVerification";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import WalletCard from "@/components/WalletCard";
import { statusColors } from "../lib/statusStyle-utils.ts";
import { useDashboardData } from "@/hooks/useDashboardData";
import {toast} from "sonner"; 
const TERMINAL_STATUSES = ["completed", "refunded", "cancelled"];
const NON_TRACKABLE_STATUSES = [
  "pending_payment",
  "cancelled",
  "refunded",
  "completed",
];

function Navbar({
  userEmail,
  isAdmin,
}: {
  userEmail: string;
  isAdmin: boolean;
}) {
  const { signOut } = useAuth();
  return (
    <nav className="border-b border-border bg-background/85 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link
          to="/"
          className="font-display text-xl font-extrabold text-foreground"
        >
          Pay<span className="text-primary">Guard</span>
        </Link>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <LayoutDashboard className="h-4 w-4 mr-1" /> Admin
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{userEmail}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

function StatsRow({
  transactions,
  profile,
}: {
  transactions: any[];
  profile: any;
}) {
  const active = transactions.filter(
    (t) => !TERMINAL_STATUSES.includes(t.status),
  ).length;
  const completed = transactions.filter((t) => t.status === "completed").length;
  const escrowTotal = transactions
    .filter((t) => t.status === "funded")
    .reduce((a, t) => a + Number(t.amount), 0);
  const trustScore = Number(profile?.trust_score || 5);

  const stats = [
    {
      label: "In Escrow",
      value: `₦${escrowTotal.toLocaleString()}`,
      sub: `${active} active`,
    },
    { label: "Completed", value: completed.toString(), sub: "settled" },
    {
      label: "Trust",
      value: trustScore.toFixed(0),
      sub: trustScore >= 8 ? "Excellent" : "Building",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-5 mb-6 sm:mb-8">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-border"
        >
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {stat.label}
          </p>
          <p className="font-display text-lg sm:text-3xl font-extrabold text-foreground mt-1 sm:mt-2">
            {stat.value}
          </p>
          <p className="text-[10px] sm:text-xs text-[hsl(160,60%,45%)] mt-0.5 sm:mt-1">
            {stat.sub}
          </p>
        </div>
      ))}
    </div>
  );
}

// Mobile card view of a transaction. Receives onEditClick and passes it down to TransactionActions, which will render the Edit button when appropriate. Clicking the Edit button will trigger the onEditClick callback with the transaction data, allowing the parent component (Dashboard) to open the edit form with the correct transaction details.
function TransactionCardMobile({
  tx,
  userId,
  onUpdated,
  onEditClick,
}: {
  tx: any;
  userId: string;
  onUpdated: () => void;
  onEditClick: (tx: any) => void; // ← added
}) {
  const navigate = useNavigate();
  return (
    <div
      className="bg-card rounded-xl border border-border p-4 space-y-3"
      onClick={() => navigate(`/transaction/${tx.id}`)}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-foreground">{tx.item_name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {tx.reference_code}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[tx.status] ?? ""}`}
        >
          {tx.status.replace(/_/g, " ")}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-bold text-foreground">
          ₦{Number(tx.amount).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(tx.created_at).toLocaleDateString()}
        </p>
      </div>
      <div
        className="flex items-center gap-2 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <TransactionActions
          transaction={tx}
          userId={userId}
          onUpdated={onUpdated}
          onEditClick={() => onEditClick(tx)} // ← wired correctly
        />
        {!NON_TRACKABLE_STATUSES.includes(tx.status) && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => navigate(`/transaction/${tx.id}`)}
          >
            <Truck className="h-3 w-3 mr-1" /> Track
          </Button>
        )}
        {tx.shareable_link && (
          <>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(tx.shareable_link)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Copy Link
            </button>
            <WhatsAppShareButton
              link={tx.shareable_link}
              itemName={tx.item_name}
              amount={tx.amount}
              size="sm"
              className="h-6 text-xs px-2"
            />
          </>
        )}
      </div>
    </div>
  );
}

function ShareableLink({ tx }: { tx: any }) {
  const handleCopyLink = () => {
    if (!tx.shareable_link) return;
    navigator.clipboard.writeText(tx.shareable_link);
    toast.success("Link copied to clipboard!");
  };
  if (!tx.shareable_link)
    return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={handleCopyLink}
        className="text-xs text-primary hover:underline font-medium bg-accent-foreground px-2 py-0.5 rounded"
      >
        Copy Link
      </button>
      <WhatsAppShareButton
        link={tx.shareable_link}
        itemName={tx.item_name}
        amount={tx.amount}
        size="sm"
        className="h-6 text-xs px-2"
      />
    </div>
  );
}

// Desktop table view of transactions. Receives onEditClick and passes it down to TransactionActions, which will render the Edit button when appropriate. Clicking the Edit button will trigger the onEditClick callback with the transaction data, allowing the parent component (Dashboard) to open the edit form with the correct transaction details.
function TransactionTableDesktop({
  transactions,
  userId,
  onUpdated,
  onEditClick,
}: {
  transactions: any[];
  userId: string;
  onUpdated: () => void;
  onEditClick: (tx: any) => void; // ← added
}) {
  const navigate = useNavigate();
  return (
    <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {[
                "Ref",
                "Item",
                "Amount",
                "Status",
                "Actions",
                "Link",
                "Date",
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
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-t border-border hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => navigate(`/transaction/${tx.id}`)}
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
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-1.5">
                    <TransactionActions
                      transaction={tx}
                      userId={userId}
                      onUpdated={onUpdated}
                      onEditClick={() => onEditClick(tx)} // ← wired correctly
                    />
                    {!NON_TRACKABLE_STATUSES.includes(tx.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => navigate(`/transaction/${tx.id}`)}
                      >
                        <Truck className="h-3 w-3 mr-1" /> Track
                      </Button>
                    )}
                  </div>
                </td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <ShareableLink tx={tx} />
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
// list of transactions with responsive design: cards on mobile, table on desktop. Also handles empty state and passes down edit create action correctly.
function TransactionList({
  transactions,
  userId,
  onUpdated,
  onCreateClick,
  onEditClick,
}: {
  transactions: any[];
  userId: string;
  onUpdated: () => void;
  onCreateClick: () => void;
  onEditClick: (tx: any) => void;
}) {
  if (transactions.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 border border-border text-center">
        <p className="text-muted-foreground">
          No transactions yet. Create your first escrow transaction to get
          started.
        </p>
        <Button className="mt-4" onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-1" /> Create Transaction
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {transactions.map((tx) => (
          <TransactionCardMobile
            key={tx.id}
            tx={tx}
            userId={userId}
            onUpdated={onUpdated}
            onEditClick={onEditClick} //  passed down
          />
        ))}
      </div>
      <TransactionTableDesktop
        transactions={transactions}
        userId={userId}
        onUpdated={onUpdated}
        onEditClick={onEditClick} //  passed down
      />
    </>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-5 mb-6 sm:mb-8">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-border animate-pulse"
        >
          <div className="h-3 w-12 bg-muted rounded mb-2" />
          <div className="h-8 w-20 bg-muted rounded sm:mt-2" />
          <div className="h-3 w-16 bg-muted rounded mt-1 sm:mt-2" />
        </div>
      ))}
    </div>
  );
}

const Dashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const {
    transactions,
    profile,
    loading: dataLoading,
    refresh,
  } = useDashboardData();

  const [showForm, setShowForm] = useState(false);
  const [showKYC, setShowKYC] = useState(false);
  const [activeTab, setActiveTab] = useState<"transactions" | "wallet">(
    "transactions",
  );
  const [editingTransaction, setEditingTransaction] = useState<any | null>(
    null,
  );

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;

  const isKYCVerified = profile?.bvn_verified || profile?.nin_verified;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email ?? ""} isAdmin={isAdmin} />

      <main className="container mx-auto px-4 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground mb-1">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate max-w-62.5 sm:max-w-none">
              Welcome back, {user.user_metadata?.display_name || user.email}.
            </p>
          </div>
          <div className="flex gap-2">
            {!isKYCVerified && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKYC(true)}
              >
                <ShieldCheck className="h-4 w-4 mr-1" />{" "}
                <span className="hidden sm:inline">Verify </span>KYC
              </Button>
            )}
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> New
                <span className="hidden sm:inline"> Transaction</span>
              </Button>
            )}
          </div>
        </div>

        {showKYC && (
          <div className="mb-8">
            <KYCVerification
              onVerified={() => {
                setShowKYC(false);
                refresh();
              }}
              onCancel={() => setShowKYC(false)}
            />
          </div>
        )}

        {showForm && (
          <div className="bg-card rounded-2xl p-5 sm:p-8 border border-border mb-6 sm:mb-8 max-w-lg">
            <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-1">
              Create Transaction
            </h2>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
              Funds will be held safely until your buyer confirms delivery.
            </p>
            <CreateTransactionForm
              onCreated={() => {
                setShowForm(false);
                refresh();
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {editingTransaction && (
          <div className="bg-card rounded-2xl p-5 sm:p-8 border border-border mb-6 sm:mb-8 max-w-lg">
            <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-1">
              Edit Transaction
            </h2>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
              You can only edit the name and description.
            </p>
            <EditTransactionForm
              transaction={editingTransaction}
              onUpdated={() => {
                setEditingTransaction(null);
                refresh();
              }}
              onCancel={() => setEditingTransaction(null)}
            />
          </div>
        )}

        <StatsRow transactions={transactions} profile={profile} />

        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("transactions")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "transactions" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Transactions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wallet")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === "wallet" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Wallet className="h-4 w-4" /> Wallet
          </button>
        </div>

        {activeTab === "wallet" ? (
          <div className="max-w-lg">
            <WalletCard />
          </div>
        ) : dataLoading ? (
          <StatsSkeleton />
        ) : (
          <TransactionList
            transactions={transactions}
            userId={user.id}
            onUpdated={refresh}
            onCreateClick={() => setShowForm(true)}
            onEditClick={(tx) => setEditingTransaction(tx)} // ← the missing piece
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
