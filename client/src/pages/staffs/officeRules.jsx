const OfficeRules = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-200 to-blue-200 p-6 pl-64">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center text-gray-800 mb-10">
          Office Rules
        </h1>
       
        <div className="bg-white p-8 rounded-2xl shadow-xl mb-8 transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
          <h2 className="text-3xl font-bold text-indigo-600 mb-4">
            Common Rules
          </h2>
          <ul className="list-disc pl-6 space-y-3 text-lg text-gray-700">
            <li className="hover:text-indigo-500 transition-colors">
              Maintain professionalism at all times.
            </li>
            <li className="hover:text-indigo-500 transition-colors">
              Respect office timings and be punctual.
            </li>
            <li className="hover:text-indigo-500 transition-colors">
              Use company resources responsibly.
            </li>
            <li className="hover:text-indigo-500 transition-colors">
              Follow all safety and security guidelines.
            </li>
            <li className="hover:text-indigo-500 transition-colors">
              Keep work areas clean and organized.
            </li>
            <li className="hover:text-indigo-500 transition-colors">
              Adhere to company policies on data privacy, confidentiality, and ethics.
            </li>
          </ul>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Rules for Boys */}
          <div className="bg-white p-8 rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
            <h2 className="text-3xl font-bold text-indigo-600 mb-4">
              Rules for Boys
            </h2>
            <div className="mb-4">
              <h3 className="text-2xl font-semibold text-green-600 mb-2">
                Dos
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-lg text-gray-700">
                <li className="hover:text-green-500 transition-colors">
                  Dress in neat, formal attire appropriate for the office.
                </li>
                <li className="hover:text-green-500 transition-colors">
                  Maintain good grooming and hygiene standards.
                </li>
                <li className="hover:text-green-500 transition-colors">
                  Communicate respectfully with all colleagues.
                </li>
                <li className="hover:text-green-500 transition-colors">
                  Be punctual and accountable for assigned tasks.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-red-600 mb-2">
                Don’ts
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-lg text-gray-700">
                <li className="hover:text-red-500 transition-colors">
                  Avoid wearing casual or inappropriate clothing.
                </li>
                <li className="hover:text-red-500 transition-colors">
                  Do not use offensive language or engage in disruptive behavior.
                </li>
                <li className="hover:text-red-500 transition-colors">
                  Refrain from neglecting your duties or deadlines.
                </li>
                <li className="hover:text-red-500 transition-colors">
                  Avoid unprofessional conduct at work.
                </li>
              </ul>
            </div>
          </div>

          {/* Rules for Girls */}
          <div className="bg-white p-8 rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
            <h2 className="text-3xl font-bold text-indigo-600 mb-4">
              Rules for Girls
            </h2>
            <div className="mb-4">
              <h3 className="text-2xl font-semibold text-green-600 mb-2">
                Dos
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-lg text-gray-700">
                <li className="hover:text-green-500 transition-colors">
                  Wear professional and modest attire suitable for the office.
                </li>
                <li className="hover:text-green-500 transition-colors">
                  Maintain excellent personal hygiene and grooming.
                </li>
                <li className="hover:text-green-500 transition-colors">
                  Communicate courteously and professionally.
                </li>
                <li className="hover:text-green-500 transition-colors">
                  Be prompt, responsible, and respectful in your duties.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-red-600 mb-2">
                Don’ts
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-lg text-gray-700">
                <li className="hover:text-red-500 transition-colors">
                  Avoid wearing overly casual, revealing, or inappropriate clothing.
                </li>
                <li className="hover:text-red-500 transition-colors">
                  Do not engage in office gossip or disruptive behavior.
                </li>
                <li className="hover:text-red-500 transition-colors">
                  Avoid arriving late or leaving early without prior notice.
                </li>
                <li className="hover:text-red-500 transition-colors">
                  Refrain from sharing confidential information inappropriately.
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
