import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import ContentCard from "@/components/ContentCard";
import { ExternalLink } from "lucide-react";

const universities = [
  {
    name: "University of South Florida (USF)",
    program: "Bachelor of Science in Computer Science",
    description:
      "USF's Computer Science program offers a comprehensive curriculum covering algorithms, software engineering, artificial intelligence, and cybersecurity. The program offers hands-on experience through research opportunities and partnerships in the Tampa Bay area's growing tech space.",
    highlights: [
      "ABET-accredited program",
      "Strong industry connections",
      "Research opportunities in AI and cybersecurity",
    ],
    link: "https://www.usf.edu/engineering/cse/",
  },
  {
    name: "University of Central Florida (UCF)",
    program: "Bachelor of Science in Computer Science",
    description:
      "UCF's Computer Science program is one of the largest in Florida and is recognized for excelling in areas like game development, simulation, and cybersecurity. Located in Orlando, students have access to internships with tech companies and theme parks.",
    highlights: [
      "Top-ranked game development program",
      "State-of-the-art facilities",
      "Proximity to major tech employers",
    ],
    link: "https://www.ucf.edu/degree/computer-science-bs/",
  },
  {
    name: "Florida State University (FSU)",
    program: "Bachelor of Science in Computer Science",
    description:
      "FSU's Department of Computer Science offers an intensive program that combines theoretical foundations and practical applications. Students can practice in areas like machine learning, data science, and software engineering while benefiting from the university's strong research programs.",
    highlights: ["Strong theoretical foundation", "Research-intensive environment", "Collaborative learning community"],
    link: "https://www.cs.fsu.edu/",
  },
];

const AcademicsBeyond = () => {
  return (
    <PageLayout>
      <PageHeader
        title="Academics Beyond HCC"
        subtitle="Exploring pathways to continue my Computer Science education"
      />

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <p className="text-lg text-muted-foreground max-w-3xl mb-12 font-body animate-slide-up">
            After completing my Associate in Arts degree at Hillsborough Community College, I plan to transfer to USF to
            earn my Bachelor's degree in Computer Science Engineering. Below are three programs I am considering for my
            continued education.
          </p>

          <div className="grid gap-8">
            {universities.map((uni, index) => (
              <ContentCard key={uni.name} title={uni.name} delay={index * 100} className="relative">
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <p className="text-lg font-semibold text-primary mb-3">{uni.program}</p>
                    <p className="mb-4">{uni.description}</p>
                    <a
                      href={uni.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Learn More <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Program Highlights</h4>
                    <ul className="space-y-2">
                      {uni.highlights.map((highlight, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0"></span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ContentCard>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default AcademicsBeyond;
