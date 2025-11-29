import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";

const citations = [
  {
    category: "Academic Programs - HCC",
    sources: [
      {
        title: "Computer Information Technology Programs",
        author: "Hillsborough Community College",
        url: "https://www.hccfl.edu/academics/areas-study/technology",
        accessed: "November 2024",
      },
      {
        title: "Associate in Arts Degree Requirements",
        author: "Hillsborough Community College",
        url: "https://www.hccfl.edu/academics/programs/associate-arts",
        accessed: "November 2024",
      },
    ],
  },
  {
    category: "Universities & Transfer Programs",
    sources: [
      {
        title: "Department of Computer Science and Engineering",
        author: "University of South Florida",
        url: "https://www.usf.edu/engineering/cse/",
        accessed: "November 2024",
      },
      {
        title: "Computer Science, B.S.",
        author: "University of Central Florida",
        url: "https://www.ucf.edu/degree/computer-science-bs/",
        accessed: "November 2024",
      },
      {
        title: "Department of Computer Science",
        author: "Florida State University",
        url: "https://www.cs.fsu.edu/",
        accessed: "November 2024",
      },
    ],
  },
  {
    category: "Career Information",
    sources: [
      {
        title: "Software Developers: Occupational Outlook Handbook",
        author: "U.S. Bureau of Labor Statistics",
        url: "https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm",
        accessed: "November 2024",
      },
      {
        title: "Google Careers - Software Engineering",
        author: "Google",
        url: "https://careers.google.com/",
        accessed: "November 2024",
      },
      {
        title: "Microsoft Careers - Cloud & AI",
        author: "Microsoft",
        url: "https://careers.microsoft.com/",
        accessed: "November 2024",
      },
      {
        title: "Tesla Careers - Engineering",
        author: "Tesla",
        url: "https://www.tesla.com/careers",
        accessed: "November 2024",
      },
    ],
  },
  {
    category: "Emerging Technology",
    sources: [
      {
        title: "Artificial Intelligence: What It Is and How It Works",
        author: "IBM",
        url: "https://www.ibm.com/topics/artificial-intelligence",
        accessed: "November 2024",
      },
      {
        title: "Machine Learning Overview",
        author: "Google Cloud",
        url: "https://cloud.google.com/learn/what-is-machine-learning",
        accessed: "November 2024",
      },
      {
        title: "Computer and Information Technology Occupations",
        author: "U.S. Bureau of Labor Statistics",
        url: "https://www.bls.gov/ooh/computer-and-information-technology/home.htm",
        accessed: "November 2024",
      },
    ],
  },
];

const WorksCited = () => {
  return (
    <PageLayout>
      <PageHeader
        title="Works Cited"
        subtitle="References and sources used in creating this portfolio"
      />

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="text-muted-foreground font-body mb-12 animate-slide-up">
            The following sources were consulted during the research and development of this 
            academic portfolio. All information has been paraphrased and presented in my own 
            words unless otherwise noted.
          </p>

          <div className="space-y-10">
            {citations.map((category, catIndex) => (
              <div
                key={category.category}
                className="animate-slide-up"
                style={{ animationDelay: `${catIndex * 100}ms` }}
              >
                <h2 className="font-heading text-xl font-semibold text-primary mb-6 pb-2 border-b border-border">
                  {category.category}
                </h2>
                <div className="space-y-6">
                  {category.sources.map((source, sourceIndex) => (
                    <div
                      key={sourceIndex}
                      className="pl-6 border-l-2 border-muted hover:border-primary transition-colors"
                    >
                      <p className="text-foreground font-body">
                        {source.author}. "{source.title}."&nbsp;
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 break-all"
                        >
                          {source.url}
                        </a>
                        . Accessed {source.accessed}.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default WorksCited;
