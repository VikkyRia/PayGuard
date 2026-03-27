import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, User, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";

// Small avatar / initials bubble 
function NavAvatar({
  url,
  displayName,
  email,
}: {
  url?: string | null;
  displayName?: string | null;
  email: string;
}) {
  const name = displayName || email;
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-7 w-7 rounded-full object-cover ring-1 ring-border"
      />
    );
  }

  return (
    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center ring-1 ring-border">
      {initials || <User className="h-3.5 w-3.5" />}
    </div>
  );
}

//  Dropdown menu 
function UserDropdown({
  userEmail,
  displayName,
  onClose,
}: {
  userEmail: string;
  displayName?: string | null;
  onClose: () => void;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleProfile = () => {
    onClose();
    navigate("/profile");
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
      {/* Identity header */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs font-medium text-foreground truncate">
          {displayName || userEmail}
        </p>
        {displayName && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {userEmail}
          </p>
        )}
      </div>

      {/* Menu items */}
      <div className="py-1">
        <button
          type="button"
          onClick={handleProfile}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          View / edit profile
        </button>
      </div>

      <div className="border-t border-border py-1">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

// Navbar component with user menu and admin link 
export default function Navbar({
  userEmail,
  isAdmin,
  avatarUrl,
  displayName,
}: {
  userEmail: string;
  isAdmin: boolean;
  avatarUrl?: string | null;
  displayName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

          {/* User trigger — avatar + email + chevron */}
          <div ref={ref} className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted transition-colors"
            >
              <NavAvatar
                url={avatarUrl}
                displayName={displayName}
                email={userEmail}
              />
              <span className="hidden sm:inline text-sm text-muted-foreground max-w-[140px] truncate">
                {displayName || userEmail}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <UserDropdown
                userEmail={userEmail}
                displayName={displayName}
                onClose={() => setOpen(false)}
              />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}