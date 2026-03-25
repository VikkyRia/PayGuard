const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <span className="font-display text-lg font-extrabold text-foreground">
          Pay<span className="text-primary">Guard</span>
        </span>
        <p className="text-sm text-muted-foreground">
          © 2025 TrustNaija. Built for the Enyata × Interswitch Buildathon.
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">API</a>
          <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
