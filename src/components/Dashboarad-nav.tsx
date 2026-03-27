import {Link} from "react-router-dom";
import { LayoutDashboard, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";

export default function Navbar({
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