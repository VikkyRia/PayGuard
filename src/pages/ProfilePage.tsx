import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Camera,
  Pencil,
  Check,
  X,
  ShieldCheck,
  Star,
  Phone,
  Mail,
  ArrowLeft,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { profileService } from "@/services/profile.service";
import Navbar from "@/components/Dashboarad-nav";
import { toast } from "sonner";

// Avatar
function Avatar({
  url,
  displayName,
  size = "lg",
}: {
  url: string | null;
  displayName: string;
  size?: "sm" | "lg";
}) {
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const dim = size === "lg" ? "h-24 w-24 text-2xl" : "h-9 w-9 text-sm";

  if (url) {
    return (
      <img
        src={url}
        alt={displayName}
        className={`${dim} rounded-full object-cover ring-2 ring-border`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center ring-2 ring-border`}
    >
      {initials || <User className="h-5 w-5" />}
    </div>
  );
}

// Stat pill 
function StatPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-muted/40 rounded-2xl px-4 py-2 flex-1 min-w-22.5">
      <div className="text-muted-foreground">{icon}</div>
      <p className="font-display text-lg font-extrabold text-foreground text-center">
        {value}
      </p>
      <p className="text-[11px]  text-muted-foreground text-center">{label}</p>
    </div>
  );
}

// Editable field 
function EditableField({
  label,
  value,
  icon,
  onSave,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  onSave: (val: string) => Promise<void>;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-border last:border-0">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </p>
        {editing ? (
          <Input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="h-8 text-sm"
            placeholder={placeholder}
          />
        ) : (
          <p className="text-sm font-medium text-foreground truncate">
            {value || (
              <span className="text-muted-foreground italic">Not set</span>
            )}
          </p>
        )}
      </div>
      {!disabled && (
        <div className="shrink-0">
          {editing ? (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-lg border border-border hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Avatar uploader
function AvatarUploader({
  userId,
  currentUrl,
  displayName,
  onUpdated,
}: {
  userId: string;
  currentUrl: string | null;
  displayName: string;
  onUpdated: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }

    setUploading(true);
    try {
      const url = await profileService.uploadAvatar(userId, file);
      await profileService.updateProfile(userId, { avatar_url: url });
      onUpdated(url);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error("Could not upload photo", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      await profileService.removeAvatar(userId);
      onUpdated(null);
      toast.success("Profile photo removed");
    } catch {
      toast.error("Could not remove photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <Avatar url={currentUrl} displayName={displayName} size="lg" />

      {/* Camera overlay */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {/* Remove button — only show if there's an avatar */}
      {currentUrl && !uploading && (
        <button
          type="button"
          onClick={handleRemove}
          title="Remove photo"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow hover:bg-destructive/90 transition-colors"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

//  Verification badge 
function VerificationBadge({
  label,
  verified,
}: {
  label: string;
  verified: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${
        verified
          ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
          : "border-border bg-muted/30 text-muted-foreground"
      }`}
    >
      <ShieldCheck className={`h-4 w-4 ${verified ? "text-green-500" : "text-muted-foreground"}`} />
      {label}
      {verified && (
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
          Verified
        </span>
      )}
    </div>
  );
}

//  Main page
export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    profileService
      .getProfile(user.id)
      .then(setProfile)
      .catch(() => toast.error("Could not load profile"))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const handleUpdate = async (field: string, value: string) => {
    try {
      const updated = await profileService.updateProfile(user.id, {
        [field]: value,
      });
      setProfile(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Could not save changes", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const trustScore = Number(profile?.trust_score ?? 0);
  const trustLabel =
    trustScore >= 8 ? "Excellent" : trustScore >= 5 ? "Good" : "Building";

  const dashboardPath =
    profile?.user_type === "buyer" ? "/buyer/dashboard" : "/dashboard";

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email ?? ""} isAdmin={isAdmin} />

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate(dashboardPath)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        <h1 className="font-display text-2xl font-extrabold text-foreground mb-6">
          My Profile
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Identity card */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-4 mb-5">
                <AvatarUploader
                  userId={user.id}
                  currentUrl={profile?.avatar_url ?? null}
                  displayName={profile?.display_name ?? user.email ?? ""}
                  onUpdated={(url) =>
                    setProfile((p: any) => ({ ...p, avatar_url: url }))
                  }
                />
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-foreground truncate">
                    {profile?.display_name || "No name set"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {profile?.user_type === "buyer" ? "Buyer" : "Seller"} account
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5 truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-3">
                <StatPill
                  label="Transactions"
                  value={profile?.total_transactions ?? 0}
                  icon={<Check className="h-4 w-4" />}
                />
                <StatPill
                  label="Trust score"
                  value={`${trustScore}  ${trustLabel}`}
                  icon={<Star className="h-4 w-4" />}
                />
                <StatPill
                  label="Disputes"
                  value={profile?.total_disputes ?? 0}
                  icon={<ShieldCheck className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Editable fields  */}
            <div className="bg-card rounded-2xl border border-border px-5 py-1">
              <EditableField
                label="Display name"
                value={profile?.display_name ?? ""}
                icon={<User className="h-4 w-4" />}
                placeholder="Your full name"
                onSave={(val) => handleUpdate("display_name", val)}
              />
              <EditableField
                label="Phone number"
                value={profile?.phone ?? ""}
                icon={<Phone className="h-4 w-4" />}
                type="tel"
                placeholder="+234 800 000 0000"
                onSave={(val) => handleUpdate("phone", val)}
              />
              {/* Email is read-only — managed by Supabase Auth */}
              <EditableField
                label="Email address"
                value={profile?.email ?? user.email ?? ""}
                icon={<Mail className="h-4 w-4" />}
                onSave={async () => {}}
                disabled
              />
            </div>

            {/* KYC / verification */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="text-sm font-medium text-foreground mb-3">
                Identity verification
              </p>
              <div className="space-y-2">
                <VerificationBadge
                  label="BVN verification"
                  verified={profile?.bvn_verified ?? false}
                />
                <VerificationBadge
                  label="NIN verification"
                  verified={profile?.nin_verified ?? false}
                />
              </div>
              {!profile?.bvn_verified && !profile?.nin_verified && (
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(dashboardPath + "?kyc=true")}
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" /> Verify your
                  identity
                </Button>
              )}
            </div>

            {/* Danger zone */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="text-sm font-medium text-foreground mb-1">
                Account
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Member since{" "}
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => navigate(dashboardPath)}
              >
                Back to dashboard
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}