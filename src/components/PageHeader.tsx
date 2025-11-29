interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  return (
    <div className="hero-gradient text-primary-foreground py-16 md:py-20 relative overflow-hidden">
      {/* Yellow accent stripes */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-accent"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent/60"></div>
      <div className="absolute -right-10 top-0 w-32 h-full bg-accent/10 skew-x-12"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center gap-4 mb-4 animate-slide-up">
          <div className="w-1.5 h-12 bg-accent rounded-full"></div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-lg md:text-xl opacity-90 max-w-2xl animate-slide-up pl-6" style={{ animationDelay: "100ms" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
