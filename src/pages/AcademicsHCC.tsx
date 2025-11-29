import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import ContentCard from "@/components/ContentCard";
import campusImage from "@/assets/campus-image.jpg";

const AcademicsHCC = () => {
  const courses = [
    { code: "COP 1000", name: "Introduction to Programming" },
    { code: "COP 2220", name: "Programming in C" },
    { code: "COP 2800", name: "Programming in Java" },
    { code: "CIS 2321", name: "Information Systems Analysis" },
    { code: "CTS 2440", name: "Database Management" },
    { code: "CGS 1100", name: "Computer Applications" },
    { code: "MAC 1105", name: "College Algebra" },
    { code: "MAC 1140", name: "Pre-Calculus Algebra" },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Academics at HCC"
        subtitle="My educational foundation at Hillsborough Community College"
      />

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Column */}
            <div className="space-y-8">
              <ContentCard title="My Major" delay={0}>
                <p className="text-lg font-semibold text-foreground mb-2">
                  Computer Science Engineering
                </p>
                <p>
                  Computer Science Engineering combines the principles of computer science and 
                  electrical engineering to develop hardware and software systems. This field 
                  prepares students for careers in software development, systems engineering, 
                  and technology innovation.
                </p>
              </ContentCard>

              <ContentCard title="Degree Program" delay={100}>
                <p className="text-lg font-semibold text-foreground mb-2">
                  Associate in Arts (A.A.) Degree
                </p>
                <p className="mb-4">
                  I am pursuing an Associate in Arts degree with a focus on Computer Science 
                  at Hillsborough Community College. This program provides a strong foundation 
                  in programming, mathematics, and computer systems that prepares students for 
                  transfer to a four-year university.
                </p>
                <p>
                  The A.A. degree ensures that I complete all general education requirements 
                  while taking foundational courses in my major field of study.
                </p>
              </ContentCard>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <div className="rounded-xl overflow-hidden card-shadow animate-slide-up" style={{ animationDelay: "150ms" }}>
                <img
                  src={campusImage}
                  alt="Hillsborough Community College Campus"
                  className="w-full h-64 object-cover"
                />
              </div>

              <ContentCard title="Program Courses" delay={200}>
                <p className="mb-4">
                  The following courses are part of my Computer Science program at HCC:
                </p>
                <div className="grid gap-2">
                  {courses.map((course, index) => (
                    <div
                      key={course.code}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg border-l-4 border-accent hover:bg-accent/10 transition-colors"
                    >
                      <span className="font-mono text-sm font-semibold text-primary-foreground bg-primary px-2 py-1 rounded">
                        {course.code}
                      </span>
                      <span className="text-foreground">{course.name}</span>
                    </div>
                  ))}
                </div>
              </ContentCard>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default AcademicsHCC;
