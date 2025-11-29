import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap, Briefcase, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import profileImage from "@/assets/profile-placeholder.jpg";

const Index = () => {
  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="hero-gradient text-primary-foreground min-h-[80vh] flex items-center">
        <div className="container mx-auto px-4 py-16">
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
                I am passionate about building innovative software solutions and exploring the 
                frontiers of technology. Currently pursuing my degree at Hillsborough Community 
                College, I am preparing for a career in software engineering and technology.
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
                <img
                  src={profileImage}
                  alt="Esteban Aguilar - Computer Science Student"
                  className="relative w-64 h-64 md:w-80 md:h-80 rounded-full object-cover border-4 border-primary-foreground/20 shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
            Explore My Portfolio
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto font-body">
            Navigate through my academic journey, future aspirations, and the emerging technologies 
            that inspire my career path.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <Link to="/academics-hcc" className="group">
              <div className="bg-card rounded-xl p-8 border border-border card-shadow transition-all duration-300 group-hover:card-shadow-hover group-hover:-translate-y-1 animate-slide-up">
                <div className="w-14 h-14 bg-secondary rounded-lg flex items-center justify-center mb-6">
                  <GraduationCap className="h-7 w-7 text-primary" />
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
              <div className="bg-card rounded-xl p-8 border border-border card-shadow transition-all duration-300 group-hover:card-shadow-hover group-hover:-translate-y-1 animate-slide-up" style={{ animationDelay: "100ms" }}>
                <div className="w-14 h-14 bg-secondary rounded-lg flex items-center justify-center mb-6">
                  <Briefcase className="h-7 w-7 text-primary" />
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
              <div className="bg-card rounded-xl p-8 border border-border card-shadow transition-all duration-300 group-hover:card-shadow-hover group-hover:-translate-y-1 animate-slide-up" style={{ animationDelay: "200ms" }}>
                <div className="w-14 h-14 bg-secondary rounded-lg flex items-center justify-center mb-6">
                  <Cpu className="h-7 w-7 text-primary" />
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
    </PageLayout>
  );
};

export default Index;
