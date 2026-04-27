import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-8 border-t border-border">
      <div className="container mx-auto px-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} CabinetMed<span className="text-secondary font-semibold">AI</span> — Projet de fin d'études en Intelligence Artificielle
        </p>
        <Link
          to="/admin"
          className="inline-block text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          Espace médecin
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
