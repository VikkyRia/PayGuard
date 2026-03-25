// src/pages/Auth.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/auth.service";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner"; // Using the modern toast manager

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  
  const navigate = useNavigate();

  const handleForgotPassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await authService.resetPassword(email);
    
    if (error) {
      toast.error("Error", { description: error.message });
    } else {
      toast.success("Check your email", { 
        description: "We sent you a password reset link." 
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await authService.signIn(email, password);
      if (error) {
        toast.error("Login failed", { description: error.message });
      } else {
        toast.success("Welcome back!", { description: "Taking you to your dashboard." });
        navigate("/dashboard");
      }
    } else {
      const { data, error } = await authService.signUp(email, password, displayName, phone);
      
      if (error) {
        toast.error("Signup failed", { description: error.message });
      } else if (data?.session) {
        toast.success("Welcome!", { description: "Your account has been created." });
        navigate("/dashboard");
      } else {
        toast.info("Check your email", { 
          description: "Please verify your email address to continue." 
        });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-body">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
          <div className="flex items-center gap-1 mb-6">
            <span className="font-display text-xl font-extrabold text-foreground">
              Pay<span className="text-primary">Guard</span>
            </span>
          </div>

          {forgotMode ? (
            <>
              <h1 className="font-display text-2xl font-extrabold text-foreground mb-1">Reset password</h1>
              <p className="text-sm text-muted-foreground mb-6">Enter your email and we'll send a reset link.</p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="you@example.com" 
                    required 
                    className="mt-2"
                  />
                </div>
                <Button type="submit" className="w-full font-display font-bold" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
              <p className="text-sm text-muted-foreground text-center mt-6">
                <button type="button" onClick={() => setForgotMode(false)} className="text-primary font-medium hover:underline">Back to login</button>
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-extrabold text-foreground mb-1">
                {isLogin ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                {isLogin ? "Log in to manage your transactions" : "Start trading with confidence"}
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <Label htmlFor="name" className="text-sm font-semibold">Display Name</Label>
                      <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" required className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
                      <Input 
                        id="phone" 
                        type="tel" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, "").slice(0, 15))} 
                        placeholder="+2348012345678" 
                        className="mt-2"
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                  <div className="relative mt-2">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {isLogin && (
                  <div className="text-right">
                    <button type="button" onClick={() => setForgotMode(true)} className="text-sm text-primary hover:underline">Forgot password?</button>
                  </div>
                )}
                <Button type="submit" className="w-full font-display font-bold" disabled={loading}>
                  {loading ? "Please wait..." : isLogin ? "Log In" : "Create Account"}
                </Button>
              </form>
              <p className="text-sm text-muted-foreground text-center mt-6">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
                  {isLogin ? "Sign up" : "Log in"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;