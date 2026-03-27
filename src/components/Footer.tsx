const Footer = () => {
  return (
    <footer className="py-8 border-t border-border">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} CabinetMed<span className="text-secondary font-semibold">AI</span> — Projet de fin d'études en Intelligence Artificielle
        </p>
      </div>
    </footer>
  );
};

export default Footer;
