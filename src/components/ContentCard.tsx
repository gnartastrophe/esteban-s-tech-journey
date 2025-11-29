import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContentCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}

const ContentCard = ({ title, children, className, delay = 0 }: ContentCardProps) => {
  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border p-6 card-shadow transition-all duration-300 hover:card-shadow-hover animate-slide-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="font-heading text-xl font-semibold text-foreground mb-4">{title}</h3>
      <div className="text-muted-foreground font-body leading-relaxed">{children}</div>
    </div>
  );
};

export default ContentCard;
