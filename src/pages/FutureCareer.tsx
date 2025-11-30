import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import ContentCard from "@/components/ContentCard";
import careerImage from "@/assets/career-image.jpg";
const careers = [{
  company: "Google",
  title: "Software Engineer",
  description: "As a Software Engineer at Google, I would work on building and maintaining large-scale systems that serve billions of their loyal users worldwide. This role involves design, development, and deployment throughout the software solutions lifetime across the various Google suite of products and services.",
  responsibilities: ["Write clean, efficient, and maintainable code", "Collaborate across teams on product development", "Participate in code reviews and technical design discussions", "Optimize applications for maximum performance and scalability"],
  salary: "$120,000 - $180,000"
}, {
  company: "Microsoft",
  title: "Cloud Solutions Developer",
  description: "A Cloud Solutions Developer at Microsoft focuses on building applications and services that run on the Azure cloud platform. This position combines software development skills with cloud architecture knowledge to create scalable, reliable solutions for businesses large and small across the world.",
  responsibilities: ["Develop cloud-based applications native to Azure services", "Design and implement microservices architectures", "Work with containerization technologies like Docker and Kubernetes", "Ensure security and compliance in cloud deployments"],
  salary: "$110,000 - $165,000"
}, {
  company: "Tesla",
  title: "Embedded Systems Engineer",
  description: "As an Embedded Systems Engineer at Tesla, I would work on the software that powers electric vehicles and energy solutions. This role combines hardware and software expertise to create innovate within the automotive industry as well as solar and battery storage technologies.",
  responsibilities: ["Develop firmware for vehicle control systems", "Optimize software for real-time performance", "Collaborate with hardware teams on system integration", "Debug and test embedded systems in vehicle environments", "Integrate software solutions for battery management systems and solar controllers"],
  salary: "$115,000 - $170,000"
}];
const FutureCareer = () => {
  return <PageLayout>
      <PageHeader title="Future Career" subtitle="Career opportunities I am pursuing in the technology industry" />

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2 animate-slide-up">
              <p className="text-lg text-muted-foreground font-body leading-relaxed">The field of Computer Science offers diverse career opportunities across many industries. With my education in Computer Science Engineering, I am preparing for roles that involve software development, systems engineering, penetration testing, security and emergent technologies. Below are three positions at leading technology companies that align with my career goals.</p>
            </div>
            <div className="rounded-xl overflow-hidden card-shadow animate-slide-up" style={{
            animationDelay: "100ms"
          }}>
              <img src={careerImage} alt="Software Engineers working in a modern tech office" className="w-full h-48 object-cover" />
            </div>
          </div>

          <div className="grid gap-8">
            {careers.map((career, index) => <ContentCard key={career.company} title={career.company} delay={index * 100 + 150}>
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <span className="text-xl font-semibold text-primary font-heading">{career.title}</span>
                      <span className="px-3 py-1 bg-secondary text-secondary-foreground text-sm font-medium rounded-full">
                        {career.salary}
                      </span>
                    </div>
                    <p className="mb-4">{career.description}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Key Responsibilities</h4>
                    <ul className="space-y-2">
                      {career.responsibilities.map((resp, i) => <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0"></span>
                          <span>{resp}</span>
                        </li>)}
                    </ul>
                  </div>
                </div>
              </ContentCard>)}
          </div>
        </div>
      </section>
    </PageLayout>;
};
export default FutureCareer;