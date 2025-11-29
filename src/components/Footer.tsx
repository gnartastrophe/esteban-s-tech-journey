const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-8">
      <div className="container mx-auto px-4 text-center">
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} Esteban Aguilar. Computer Science Engineering Portfolio.
        </p>
        <p className="text-muted-foreground text-xs mt-2">
          Hillsborough Community College — Final Project
        </p>
      </div>
    </footer>
  );
};

export default Footer;
