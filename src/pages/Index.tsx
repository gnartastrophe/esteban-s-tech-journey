import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap, Briefcase, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import profileImage from "@/assets/profile-placeholder.jpg";
const Index = () => {
  return <PageLayout>
      {/* Hero Section */}
      <section className="hero-gradient text-primary-foreground min-h-[80vh] flex items-center relative overflow-hidden">
        {/* Yellow Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-accent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent/50"></div>
        <div className="absolute -right-20 top-1/4 w-40 h-96 bg-accent/20 rotate-12 blur-sm"></div>
        <div className="absolute -left-10 bottom-1/4 w-32 h-64 bg-accent/10 -rotate-12 blur-sm"></div>
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 animate-slide-up">
              <p className="text-accent font-semibold mb-4 uppercase tracking-wider text-sm drop-shadow-md">
                Welcome to My Portfolio
              </p>
              <h1 className="font-heading text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Esteban Aguilar
              </h1>
              <p className="text-xl md:text-2xl opacity-90 mb-4 font-body">
                Computer Science Engineering Student
              </p>
              <p className="text-lg opacity-80 mb-8 font-body leading-relaxed max-w-lg">
                I am passionate about building software  and exploring the ever-evolving field of technology. I am currently pursuing my degree at Hillsborough Community College, and am preparing for a career in software, specifically full-stack web development.     
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/academics-hcc">
                  <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/80 font-body font-semibold shadow-lg">
                    Explore My Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/future-career">
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-body">
                    View Career Goals
                  </Button>
                </Link>
              </div>
            </div>
            <div className="order-1 md:order-2 flex justify-center animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl transform scale-110"></div>
                <img alt="Esteban Aguilar - Computer Science Student" className="relative w-64 h-64 md:w-80 md:h-80 rounded-full object-cover border-4 border-primary-foreground/20 shadow-2xl" src="/lovable-uploads/225e25de-3d32-4733-a51c-26a229a98189.jpg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-20 bg-background relative">
        {/* Yellow accent bar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-accent rounded-full"></div>
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
            Explore My Portfolio
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto font-body">
            Navigate through my prospective academic path, future goals, and the emerging technologies that inspire my career path.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <Link to="/academics-hcc" className="group">
              <div className="bg-card rounded-xl p-8 border-2 border-border hover:border-accent card-shadow transition-all duration-300 group-hover:card-shadow-hover group-hover:-translate-y-1 animate-slide-up relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-accent"></div>
                <div className="w-14 h-14 bg-accent/20 rounded-lg flex items-center justify-center mb-6">
                  <GraduationCap className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                  Academic Path
                </h3>
                <p className="text-muted-foreground font-body">
                  Discover my current studies at HCC and my educational roadmap for the future.
                </p>
              </div>
            </Link>
            <Link to="/future-career" className="group">
              <div className="bg-card rounded-xl p-8 border-2 border-border hover:border-accent card-shadow transition-all duration-300 group-hover:card-shadow-hover group-hover:-translate-y-1 animate-slide-up relative overflow-hidden" style={{
              animationDelay: "100ms"
            }}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-accent"></div>
                <div className="w-14 h-14 bg-accent/20 rounded-lg flex items-center justify-center mb-6">
                  <Briefcase className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                  Career Goals
                </h3>
                <p className="text-muted-foreground font-body">
                  Learn about the career opportunities I am pursuing in the tech industry.
                </p>
              </div>
            </Link>
            <Link to="/emerging-tech" className="group">
              <div className="bg-card rounded-xl p-8 border-2 border-border hover:border-accent card-shadow transition-all duration-300 group-hover:card-shadow-hover group-hover:-translate-y-1 animate-slide-up relative overflow-hidden" style={{
              animationDelay: "200ms"
            }}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-accent"></div>
                <div className="w-14 h-14 bg-accent/20 rounded-lg flex items-center justify-center mb-6">
                  <Cpu className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                  Emerging Tech
                </h3>
                <p className="text-muted-foreground font-body">
                  Explore the cutting-edge technologies shaping the future of computing.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>;
};
export default Index;