import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import ContentCard from "@/components/ContentCard";
import emergingTechImage from "@/assets/emerging-tech.jpg";

const EmergingTech = () => {
  return (
    <PageLayout>
      <PageHeader title="Emerging Technology" subtitle="Exploring Artificial Intelligence and Machine Learning" />

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 mb-12">
            <div className="animate-slide-up">
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">
                Artificial Intelligence & Machine Learning
              </h2>
              <p className="text-muted-foreground font-body leading-relaxed mb-4">
                Artificial Intelligence (AI) and Machine Learning (ML) represent some of the most transformative
                technologies of our time. These technologies enable computers to learn from data, recognize patterns,
                and make decisions with minimal human intervention.
              </p>
              <p className="text-muted-foreground font-body leading-relaxed">
                From voice assistants like Siri and Alexa to recommendation systems on Netflix and Spotify, AI and ML
                are already deeply integrated into our daily lives. As these technologies continue to advance, they will
                reshape industries ranging from healthcare and transportation to finance and entertainment.
              </p>
            </div>
            <div
              className="rounded-xl overflow-hidden card-shadow animate-slide-up"
              style={{ animationDelay: "100ms" }}
            >
              <img
                src={emergingTechImage}
                alt="Artificial Intelligence neural network visualization"
                className="w-full h-full object-cover min-h-[300px]"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <ContentCard title="How It's Used" delay={150}>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-foreground">Healthcare:</strong> AI assists in diagnosing diseases,
                    analyzing medical images, and developing personalized treatment plans.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-foreground">Autonomous Vehicles:</strong> Self-driving cars use ML to
                    interpret sensor data and navigate roads safely.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-foreground">Natural Language Processing:</strong> Powers chatbots,
                    translation services, and voice assistants.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-foreground">Cybersecurity:</strong> Detects threats and anomalies in network
                    traffic to protect systems from attacks.
                  </div>
                </li>
              </ul>
            </ContentCard>

            <ContentCard title="How I Will Use It" delay={200}>
              <p className="mb-4">
                As a Computer Science Engineering student, I plan to leverage AI and ML in several ways throughout my
                career:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0"></span>
                  <span>Building intelligent applications that can learn and adapt to user behavior</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0"></span>
                  <span>Developing automation tools that improve software development workflows</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0"></span>
                  <span>Creating data-driven solutions for complex engineering problems</span>
                </li>
              </ul>
            </ContentCard>

            <ContentCard title="Connection to My Career" delay={250}>
              <p className="mb-4">
                AI and ML align perfectly with my career aspirations in software engineering. Major technology companies
                like Google, Microsoft, and Tesla heavily invest in AI research and development.
              </p>
              <p>
                By developing expertise in these technologies, I will be well-positioned for roles that involve building
                intelligent systems, whether that's developing cloud-based AI services at Microsoft or working on
                autonomous vehicle software at Tesla.
              </p>
            </ContentCard>

            <ContentCard title="Why It Interests Me" delay={300}>
              <p className="mb-4">
                What fascinates me most about AI and Machine Learning is their potential to solve problems that it is
                able to compose very concise messages and maintain efficient workflows while outputting consistent data
                structures and frameworks that I can utilitize and refine. The ability to teach machines to recognize
                patterns, understand language, and make predictions opens up endless possibilities.
              </p>
              <p>
                I am excited by the rapid pace of innovation in this field, it almost feels as though we're no longer
                bound by Moore's Law. The opportunity to contribute to technologies that will shape how we live and work
                in the future. The intersection of creativity and technical challenge in AI development perfectly aligns
                my interests and goals.
              </p>
            </ContentCard>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default EmergingTech;
