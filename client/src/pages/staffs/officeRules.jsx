const OfficeRules = () => {
  return (
    // Adjust overall padding to account for a sidebar, with responsiveness
    <div className="min-h-screen bg-gradient-to-br from-red-100 to-blue-100 p-6 md:pl-64">
      <div className="max-w-4xl mx-auto py-8"> {/* Added vertical padding */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-gray-800 mb-12 leading-tight"> {/* Adjusted size for responsiveness, added leading */}
          Company Guidelines & <br className="md:hidden"/> Office Rules
        </h1>

        {/* Common Rules Section */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl mb-10 transition-transform duration-300 hover:scale-[1.01] hover:shadow-2xl border border-gray-100"> {/* Refined hover scale, added subtle border */}
          <h2 className="text-2xl md:text-3xl font-bold text-indigo-700 mb-5 border-b-2 border-indigo-200 pb-2"> {/* Stronger indigo, bottom border */}
            Common Rules for Everyone
          </h2>
          <ul className="list-disc pl-5 md:pl-6 space-y-3 text-base md:text-lg text-gray-700"> {/* Adjusted list spacing and text size */}
            <li className="hover:text-indigo-600 transition-colors duration-200">
              Maintain professionalism and a positive attitude at all times.
            </li>
            <li className="hover:text-indigo-600 transition-colors duration-200">
              Respect office timings; **punctuality is essential**.
            </li>
            <li className="hover:text-indigo-600 transition-colors duration-200">
              Use company resources (internet, equipment) responsibly and ethically.
            </li>
            <li className="hover:text-indigo-600 transition-colors duration-200">
              Strictly follow all **safety and security guidelines**.
            </li>
            <li className="hover:text-indigo-600 transition-colors duration-200">
              Keep your work area clean, organized, and tidy.
            </li>
            <li className="hover:text-indigo-600 transition-colors duration-200">
              Adhere to company policies on **data privacy, confidentiality, and professional ethics**.
            </li>
            <li className="hover:text-indigo-600 transition-colors duration-200">
              Ensure clear and respectful communication with all colleagues and clients.
            </li>
          </ul>
        </div>

        {/* Gender-Specific Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Rules for Boys */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl transition-transform duration-300 hover:scale-[1.01] hover:shadow-2xl border border-gray-100">
            <h2 className="text-2xl md:text-3xl font-bold text-indigo-700 mb-5 border-b-2 border-indigo-200 pb-2">
              Rules for Men
            </h2>
            <div className="mb-6"> {/* Increased bottom margin */}
              <h3 className="text-xl md:text-2xl font-semibold text-green-700 mb-3 flex items-center"> {/* Stronger green, flex for icon alignment */}
                <span className="mr-2">&#10003;</span> Dos
              </h3>
              <ul className="list-disc pl-5 md:pl-6 space-y-2 text-base md:text-lg text-gray-700">
                <li className="hover:text-green-600 transition-colors duration-200">
                  Dress in **neat, formal attire** (e.g., collared shirts, trousers).
                </li>
                <li className="hover:text-green-600 transition-colors duration-200">
                  Maintain good personal grooming and hygiene standards.
                </li>
                <li className="hover:text-green-600 transition-colors duration-200">
                  Communicate respectfully and professionally with all colleagues.
                </li>
                <li className="hover:text-green-600 transition-colors duration-200">
                  Be punctual for work and accountable for assigned tasks.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-semibold text-red-700 mb-3 flex items-center"> {/* Stronger red, flex for icon alignment */}
                <span className="mr-2">&#10060;</span> Don’ts
              </h3>
              <ul className="list-disc pl-5 md:pl-6 space-y-2 text-base md:text-lg text-gray-700">
                <li className="hover:text-red-600 transition-colors duration-200">
                  Avoid wearing **overly casual clothing** (e.g., shorts, t-shirts).
                </li>
                <li className="hover:text-red-600 transition-colors duration-200">
                  Do not use offensive language or engage in disruptive behavior.
                </li>
                <li className="hover:text-red-600 transition-colors duration-200">
                  Refrain from neglecting your duties or missing deadlines.
                </li>
                <li className="hover:text-red-600 transition-colors duration-200">
                  Avoid any unprofessional conduct or inappropriate interactions at work.
                </li>
              </ul>
            </div>
          </div>

          {/* Rules for Girls */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl transition-transform duration-300 hover:scale-[1.01] hover:shadow-2xl border border-gray-100">
            <h2 className="text-2xl md:text-3xl font-bold text-indigo-700 mb-5 border-b-2 border-indigo-200 pb-2">
              Rules for Women
            </h2>
            <div className="mb-6"> {/* Increased bottom margin */}
              <h3 className="text-xl md:text-2xl font-semibold text-green-700 mb-3 flex items-center">
                <span className="mr-2">&#10003;</span> Dos
              </h3>
              <ul className="list-disc pl-5 md:pl-6 space-y-2 text-base md:text-lg text-gray-700">
                <li className="hover:text-green-600 transition-colors duration-200">
                  Wear **professional and modest attire** suitable for the office (e.g., salwar kameez, sarees, formal trousers/skirts with appropriate tops).
                </li>
                <li className="hover:text-green-600 transition-colors duration-200">
                  Maintain excellent personal hygiene and professional grooming.
                </li>
                <li className="hover:text-green-600 transition-colors duration-200">
                  Communicate courteously and professionally with all colleagues.
                </li>
                <li className="hover:text-green-600 transition-colors duration-200">
                  Be prompt, responsible, and respectful in fulfilling your duties.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-semibold text-red-700 mb-3 flex items-center">
                <span className="mr-2">&#10060;</span> Don’ts
              </h3>
              <ul className="list-disc pl-5 md:pl-6 space-y-2 text-base md:text-lg text-gray-700">
                <li className="hover:text-red-600 transition-colors duration-200">
                  Avoid wearing **overly casual, revealing, or inappropriate clothing**.
                </li>
                <li className="hover:text-red-600 transition-colors duration-200">
                  Do not engage in office gossip, disruptive behavior, or personal calls in open areas.
                </li>
                <li className="hover:text-red-600 transition-colors duration-200">
                  Avoid arriving late or leaving early without prior notification and approval.
                </li>
                <li className="hover:text-red-600 transition-colors duration-200">
                  Refrain from sharing confidential company information inappropriately.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficeRules;