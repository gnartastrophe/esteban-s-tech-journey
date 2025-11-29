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
        "bg-card rounded-lg border-2 border-border p-6 card-shadow transition-all duration-300 hover:card-shadow-hover hover:border-accent/50 animate-slide-up relative overflow-hidden",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
      <h3 className="font-heading text-xl font-semibold text-foreground mb-4 pl-2">{title}</h3>
      <div className="text-muted-foreground font-body leading-relaxed pl-2">{children}</div>
    </div>
  );
};

export default ContentCard;
