import { useState } from "react";
import { kycService, type VerificationMethod } from "@/services/kyc.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface KYCVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
}
  

const KYCVerification = ({ onVerified, onCancel }: KYCVerificationProps) => {
  const [method, setMethod] = useState<VerificationMethod>("nin");
  const [idNumber, setIdNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);

  const idLength = 11;
  const idLabel = method === "bvn" ? "BVN (Bank Verification Number)" : "NIN (National Identification Number)";

  const handleVerify = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (idNumber.length !== idLength) {
      toast.error(`${method.toUpperCase()} must be ${idLength} digits`);
      return;
    }

    setLoading(true);
    try {
      const response = await kycService.verify({
        method,
        idNumber,
        firstName,
        lastName,
        dob
      });

      if (response?.success) {
        toast.success(response.message || `${method.toUpperCase()} verified successfully!`);
        onVerified();
      } else {
        toast.error(response?.message || "Verification failed");
      }
    } catch (err: unknown) {
      toast.error("Verification failed", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-8 border border-border max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Identity Verification</h2>
          <p className="text-xs text-muted-foreground">Required for transactions above ₦50,000. Verify with BVN or NIN.</p>
        </div>
      </div>

      {/* Method selector */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-5">
        <button
          type="button"
          onClick={() => { setMethod("nin"); setIdNumber(""); }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${method === "nin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          NIN Verification
        </button>
        <button
          type="button"
          onClick={() => { setMethod("bvn"); setIdNumber(""); }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${method === "bvn" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          BVN Verification
        </button>
      </div>

      {method === "nin" && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 mb-4">
          🔒 Your NIN is only used for identity verification and is not stored or linked to any bank account.
        </p>
      )}
      {method === "bvn" && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 mb-4">
          🔒 Your BVN is only used for identity verification. We cannot access or debit your bank account with it.
        </p>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <Label htmlFor="idNumber" className="text-sm font-semibold">
            {idLabel}
          </Label>
          <Input
            id="idNumber"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, "").slice(0, idLength))}
            placeholder="12345678901"
            className="mt-2 bg-muted/50 border-border focus:border-primary"
            maxLength={idLength}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName" className="text-sm font-semibold">First Name</Label>
            <Input 
              id="firstName" 
              value={firstName} 
              onChange={(e) => setFirstName(e.target.value)} 
              placeholder="Chima" 
              className="mt-2 bg-muted/50 border-border" 
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-sm font-semibold">Last Name</Label>
            <Input 
              id="lastName" 
              value={lastName} 
              onChange={(e) => setLastName(e.target.value)} 
              placeholder="Victoria" 
              className="mt-2 bg-muted/50 border-border" 
            />
          </div>
        </div>

        <div>
          <Label htmlFor="dob" className="text-sm font-semibold">Date of Birth</Label>
          <Input 
            id="dob" 
            type="date" 
            value={dob} 
            onChange={(e) => setDob(e.target.value)} 
            className="mt-2 bg-muted/50 border-border" 
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading || idNumber.length !== idLength} className="flex-1 font-display font-bold">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</>
            ) : (
              `Verify ${method.toUpperCase()}`
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="font-display font-bold">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default KYCVerification;
