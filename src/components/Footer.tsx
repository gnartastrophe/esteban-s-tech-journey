const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-8 relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-accent"></div>
      <div className="container mx-auto px-4 text-center">
        <p className="text-primary-foreground/90 text-sm">
          © {new Date().getFullYear()} <span className="text-accent font-semibold">Esteban Aguilar</span>. Computer Science Engineering Portfolio.
        </p>
        <p className="text-primary-foreground/70 text-xs mt-2">
          Hillsborough Community College — Final Project
        </p>
      </div>
    </footer>
  );
};

export default Footer;
