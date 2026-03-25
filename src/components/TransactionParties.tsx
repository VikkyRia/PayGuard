import { ShieldCheck } from "lucide-react";

interface PartyCardProps {
  label: string;
  profile: any;
}

function PartyCard({ label, profile }: PartyCardProps) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
        {label}
      </p>
      <p className="font-semibold text-foreground">
        {profile?.display_name || "Unknown"}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-muted-foreground">
          Trust: {Number(profile?.trust_score || 5).toFixed(1)}/10
        </span>
        <span className="text-xs text-muted-foreground">
          · {profile?.total_transactions || 0} transactions
        </span>
        {(profile?.bvn_verified || profile?.nin_verified) && (
          <span className="text-xs text-primary flex items-center gap-0.5">
            <ShieldCheck className="h-3 w-3" /> Verified
          </span>
        )}
      </div>
    </div>
  );
}

interface Props {
  sellerProfile: any;
  buyerProfile: any;
}

export function TransactionParties({ sellerProfile, buyerProfile }: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <PartyCard label="Seller" profile={sellerProfile} />
      <PartyCard label="Buyer" profile={buyerProfile} />
    </div>
  );
}
