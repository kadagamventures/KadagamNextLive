export default function AboutPage() {
  const liStyle = {
    fontFamily: 'Josefin Sans !important',
    fontWeight: 400,
    fontSize: '22px',
    lineHeight: '33px',
    letterSpacing: '0%',
    textAlign: 'justify',
    color: 'rgba(142,141,147,1)',
  };

  return (
    <div className="relative min-h-screen flex" style={{ backgroundColor: '#000' }}>
      <div className="relative w-full max-w-6xl mx-auto py-20 px-8 text-white">
        <h1
          className="mb-12 text-center"
          style={{
            fontFamily: 'Josefin Sans !important' ,
            fontWeight: 700,
            fontSize: '60px',
            lineHeight: '76px',
            letterSpacing: '0%',
            textTransform: 'capitalize',
          }}
        >
          <span style={{ color: '#FFF' }}>About </span>
          <span
            style={{
              background: 'linear-gradient(90deg, #F7F7F7 0%, #585554 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Kadagam Next
          </span>
        </h1>

        {/* Section: Who We Are */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-4"
            style={{
              background: 'linear-gradient(90deg, #F7F7F7 0%, #585554 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Kadagam Ventures Journey
          </h2>
          <li style={liStyle}>
            At Kadagam Ventures, we believe that business is not just about profit it’s about purpose.

Kadagam Ventures is more than an IT company it’s a purpose-driven force where innovation meets impact and progress uplifts people.

Founded by Mr. Naveen Kumar, our journey bridges the digital world with human values. We don’t just build technology. we craft intelligent platforms, design transformative experiences, and ignite positive change.

Our products fuel industry evolution; our deeper mission is rooted in creating opportunities that uplift communities and shape a better tomorrow.
          </li>
          <li style={liStyle} className="mt-6">
            We specialize in delivering cutting-edge web, mobile, and enterprise applications that drive business growth and digital transformation.

From dynamic websites and scalable web apps to powerful e-commerce platforms, we help businesses expand their online presence and enhance operational efficiency in a connected world.

But we don’t stop at innovation we lead with intention.

We believe in technology that not only transforms businesses but transforms lives.
          </li>
        </section>

        {/* Section: Our Product */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-4"
            style={{
              background: 'linear-gradient(90deg, #F7F7F7 0%, #585554 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Kadagam Next
          </h2>
          <li style={liStyle}>
            Kadagam Next is our flagship product a full-stack multi-tenant SaaS task management platform designed for startups, SMEs, and enterprise teams.
          </li>
          <li style={liStyle} className="mt-6">
            It offers comprehensive modules for Task Management, Project Tracking, Staff Management, Attendance Logging, Real-time Chat, Reports, and Permissions all in one platform.
          </li>
          <li style={liStyle} className="mt-6">
            With Kadagam Next, we aim to bridge the gap between complexity and usability by delivering enterprise-level power in a seamless, user-friendly interface.
          </li>
        </section>

        {/* Section: What Sets Us Apart */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-4"
            style={{
              background: 'linear-gradient(90deg, #F7F7F7 0%, #585554 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            What Sets Us Apart
          </h2>
          <ul className="list-disc list-inside space-y-3">
            <li style={liStyle}>Clean and scalable multi-tenant SaaS architecture</li>
            <li style={liStyle}>Real-time reporting with WebSocket and Redis integration</li>
            <li style={liStyle}>AWS-powered storage and email infrastructure</li>
            <li style={liStyle}>Custom plan management and payment lifecycle for companies</li>
            <li style={liStyle}>Dedicated Super Admin dashboard for platform control and insights</li>
          </ul>
        </section>

        {/* Section: Our Vision */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-4"
            style={{
              background: 'linear-gradient(90deg, #F7F7F7 0%, #585554 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Our Vision
          </h2>
          <li style={liStyle}>
            At Kadagam Ventures, we envision a future where technology becomes the backbone of sustainable progress.

We are building more than just software we’re building the infrastructure for a smarter, more inclusive tomorrow.

As a forward-thinking IT company, our mission is to lead the way in digital innovation, delivering smart, scalable solutions that help businesses evolve with confidence.

We aim to be a global leader in delivering intelligent, future-ready IT solutions that empower businesses to operate smarter, scale faster, and innovate boldly.
          </li>
        </section>

        {/* Section: Contact */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Contact Information</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Email: info@kadagamventures.com</li>
            <li style={liStyle}>Address: Kadagam Ventures Pvt Ltd, No: 34, Venkatappa Road, Tasker Town, Off Queens Road, Bengaluru – 560051</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
