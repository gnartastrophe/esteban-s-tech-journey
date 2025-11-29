interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  return (
    <div className="hero-gradient text-primary-foreground py-16 md:py-20">
      <div className="container mx-auto px-4">
        <h1 className="font-heading text-3xl md:text-5xl font-bold mb-4 animate-slide-up">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-xl opacity-90 max-w-2xl animate-slide-up" style={{ animationDelay: "100ms" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
