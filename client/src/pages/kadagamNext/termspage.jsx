
export default function PrivacyPolicyPage() {
  // common style for all list items
  const liStyle = {
    fontFamily: 'Josefin Sans',
    fontWeight: 400,
    fontSize: '22px',
    lineHeight: '33px',
    letterSpacing: '0%',
    textAlign: 'justify',
    color: 'rgba(142,141,147,1)'
  };
  return (
    <div className="relative min-h-screen flex" style={{ backgroundColor: '#000' }}>
      {/* Full black background */}
      <div className="relative w-full max-w-6xl mx-auto py-20 px-8 text-white">
        {/* Main Title: split into white and gradient parts */}
        <h1 className="mb-12 text-center" style={{ fontFamily: 'Josefin Sans', fontWeight: 700, fontSize: '60px', lineHeight: '76px', letterSpacing: '0%', textTransform: 'capitalize' }}>
          <span style={{ color: '#FFF' }}>Terms and </span>
          <span style={{ background: 'linear-gradient(90deg, #F7F7F7 0%, #585554 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Conditions of Use
          </span>
        </h1>

        {/* Section Title with gradient on "Conditions of Use" */}
        <h2
          className="text-3xl font-semibold mb-4"
          style={{
            background: 'linear-gradient(90deg, #F7F7F7 0%, #585554 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Indroduction
        </h2>
        <li style={liStyle} className="text-gray-300 mb-8 text-justify ">
          Welcome to Kadagam Venture Private Limited (the “Kadagamnext Platform” or “Portal”). This Portal, accessible at www.kadagamnext.com, is owned and operated by Kadagam Venture Private Limited. By accessing, browsing, or using the Portal, you agree to comply with and be bound by the following Terms and Conditions of Use.
        </li>

        <li style={liStyle} className="text-gray-300 mb-8 text-justify">
          Welcome to Kadagam Next. By using our platform and services, you (“User,” “Client,” or “Organization”) agree to these Terms and Conditions. If you do not agree, please discontinue use of the platform.
        </li>

        <li style={liStyle} className="text-gray-300 mb-8 text-justify">
          Kadagamnext offers, like Task management, Project management, Employee management (role assignments, employment history), Payroll processing possibly other HR, workflow, or IT service management tools. These Terms and Conditions apply to all interactions on the Platform, including account registration, service usage, and payments. reserves the right to modify or update these terms at any time, and it is your responsibility to review the Terms and Conditions periodically to stay informed of any changes. By continuing to use the Platform after such updates, you agree to the revised terms.
        </li>

        <li style={liStyle} className="text-gray-300 mb-8 text-justify">
          Please read these Terms carefully. If you do not agree to all of these Terms and Conditions, you must refrain from using this Portal. Continued use of this Portal confirms your acceptance of the terms set forth below, as well as any future modifications to these Terms and Conditions as updated by Kadagam Venture Private Limited.
        </li>

        <ul className="list-disc list-inside text-gray-300 mb-8 text-justify space-y-5">
          <li style={liStyle}>Prohibited Actions: You must not modify, copy, distribute, transmit, display, perform, reproduce, publish, license, create derivative works from, or sell any Content or information obtained from the Portal without the prior written consent of the Company.</li>
          <li style={liStyle}>Automated Access: You are prohibited from using any automated software, algorithms, or manual processes to scrape, crawl, or copy any Content or information from the Portal.</li>
          <li style={liStyle}>Fair Usage: You must not use the Portal in any manner that could damage, disable, overburden, or impair its functionality, or interfere with any other party&apas;s use and enjoyment of the Portal.</li>
          <li style={liStyle}>Account Security: Account holders are solely responsible for maintaining the confidentiality of their account login credentials. Any activity that occurs under your account is your responsibility.</li>
          <li style={liStyle}>Order Cancellations: The Company may, at any time, decline or cancel an order due to reasons such as unavailability of the product, pricing errors, or any issues with the Customer’s payment method. If an order is cancelled after payment has been processed, the Company will issue a refund in accordance with its Company&apas;s refund policy.</li>
          <li style={liStyle}>Payment Processing: Payments for orders are processed securely through an e-payment gateway, and all transactions are subject to the terms and conditions of the chosen payment processor. The Company does not store sensitive payment information on its servers.</li>
          <li style={liStyle}>Pricing and Taxes: All prices are displayed on the Portal and are exclusive of applicable taxes unless stated otherwise. Customers are responsible for reviewing all charges and ensuring they understand the total cost before confirming an order.</li>
        </ul>

        {/* Section 1 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">1. Scope of Services</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Kadagam Next offers software tools and digital solutions for:</li>
            <ul className="list-disc list-inside pl-6 space-y-1">
              <li style={liStyle}>Task and project management</li>
              <li style={liStyle}>Employee role and history tracking</li>
              <li style={liStyle}>Payroll and HR management</li>
              <li style={liStyle}>Communication tools for internal operations</li>
              <li style={liStyle}>Additional workflow and productivity tools and much more.</li>
            </ul>
            <li style={liStyle}>These services may be customized and used by IT companies, HR departments, small businesses, and enterprise teams.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">2. User Accounts</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Organisations and individuals must register to access full platform features.</li>
            <li style={liStyle}>Users are responsible for their login credentials.</li>
            <li style={liStyle}>Shared or unauthorised access is prohibited.</li>
            <li style={liStyle}>“Agreement” refers to these Terms and Conditions, including any amendments, modifications, or updates made by Kadagam Venture Private Limited (the “Company”) at its discretion.</li>
            <li style={liStyle}>“Content” means any text, images, audio, video, software, or other materials provided or uploaded by the Company, its users, or third parties onto the Portal, including any promotional, informational, or instructional material.</li>
          </ul>
        </section>


        {/* Section  */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">ACCESS AND USE</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>The Portal is provided for commercial use only, By accessing and using this Portal, you agree to the following terms:</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">3. PRODUCT DESCRIPTIONS</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>The Company makes reasonable efforts to ensure that Product descriptions, including specifications, images, and pricing, are accurate and up-to-date. However, occasional errors, inaccuracies, or omissions may occur. The Company reserves the right to correct any such errors in Product descriptions, including after an order has been placed.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">4. CANCELLATION FEES AND REFUNDS</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Cancellation Window: Customers may cancel their order within 6 hours of placing the order. Cancellations made after this period may not be eligible for a full refund.</li>
          </ul>
        </section>

        {/* Section 5  */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">5. BINDING ARBITRATION</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>If mediation is unsuccessful, either party may propose to settle the dispute by binding arbitration under the rules of [Specific Arbitration Association]. The decision reached by arbitration shall be final and binding on both parties, and neither party shall have the right to appeal the decision in a court of law.</li>
            <li style={liStyle}>Please review our Privacy Notice, which also governs your visit to kadagamnext.com, to understand our practices regarding your personal information. The personal information and data provided to us during your usage of Kadagamnext will be treated as strictly confidential, and by the Privacy Notice and applicable laws and regulations.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">6. Permitted Usage</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Users agree to use the platform only for lawful, authorised purposes, including business operations, task coordination, HR/payroll, and related functions.</li>
            <li style={liStyle}>Prohibited activities include:</li>
            <li style={liStyle}>Misuse of payroll or employee data</li>
            <li style={liStyle}>Unauthorised data extraction or scraping</li>
            <li style={liStyle}>Attempting to breach platform security or systems </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">7. Data Input and Responsibility</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Clients are responsible for the accuracy of the data they input (task assignments, employee data, salary information, etc.)</li>
            <li style={liStyle}>Kadagam Next is not liable for errors in output resulting from incorrect or incomplete input.</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">8. Service Fees</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Subscription-based plans and service-based fees apply.</li>
            <li style={liStyle}>Non-payment may result in service suspension after notice.</li>
            <li style={liStyle}>Fees are non-refundable unless otherwise stated.</li>
          </ul>
        </section>

        {/* Section 9 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">9. Intellectual Property</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>All trademarks, software, designs, and platform components are owned by Kadagam Ventures Pvt Ltd unless otherwise stated.</li>
          </ul>
        </section>

        {/* Section 10  */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">10. Third-Party Integrations</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Kadagam Next may offer third-party tool integration (e.g., calendar, email, payroll APIs). Users agree to any third-party terms is required.</li>
          </ul>
        </section>

        {/* Section 11  */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">11. Termination</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>We reserve the right to terminate accounts for:</li>
            <ul className="list-disc list-inside pl-6 space-y-1">
              <li style={liStyle}>Violation of these terms</li>
              <li style={liStyle}>Fraudulent or malicious activity</li>
              <li style={liStyle}>Legal or regulatory requirements</li>
            </ul>
          </ul>
        </section>

        {/* Section 12  */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">12. Liability Limitation</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Kadagam Next is not liable for:</li>
            <ul className="list-disc list-inside pl-6 space-y-1">
              <li style={liStyle}>Loss of business due to platform downtime</li>
              <li style={liStyle}>Payroll miscalculations due to incorrect inputs</li>
              <li style={liStyle}>Data breach caused by user negligence</li>
            </ul>
          </ul>
        </section>

        {/* Section 13  */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">13. Amendments</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>We may revise these terms periodically. Continued use indicates acceptance of the latest version.</li>
          </ul>
        </section>
        {/* Section 14  */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">14. GOVERNING LAW</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>These Terms and Conditions shall be governed by and construed by the applicable laws of India. Any disputes arising out of or related to these Terms and Conditions shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka.</li>
          </ul>
        </section>

        {/* Section 15 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">15. Security of Your Information</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>We implement a variety of security measures to maintain the safety of your personal information. However, please be aware that no method of transmission over the internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.</li>
          </ul>
        </section>

        {/* Section 16 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">16. Your Rights</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>You have the right to:</li>
            <ul className="list-disc list-inside pl-6 space-y-1">
              <li style={liStyle}>Access your personal information and request corrections</li>
              <li style={liStyle}>Request the deletion of your personal information</li>
              <li style={liStyle}>Object to the processing of your personal information.</li>
              <li style={liStyle}>Withdraw consent where we rely on your consent to process your information.</li>
            </ul>
          </ul>
        </section>

        {/* Section 17  */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">17. Cookies and Tracking Technologies</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Our website may use cookies and similar tracking technologies to enhance user experience. You can choose to accept or decline cookies. Most web browsers automatically accept cookies, but you can modify your browser setting to decline cookies if you prefer.</li>
          </ul>
        </section>

        {/* Section 18 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">18. Third-Party Links</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Our website may contain links to third-party websites. We do not control these websites and are not responsible for their content or privacy practices. We encourage you to review the privacy policies of any third-party websites you visit.</li>
          </ul>
        </section>

        {/* Section 19 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">19. Changes to This Privacy Policy</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date. We encourage you to review this policy periodically for any changes.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">20. Refund Policy</h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>Kadagam Venture Private Limited offers services on a subscription or service-based model. Payments made for subscriptions, modules, or service usage are generally non-refundable, except in cases where a service is not delivered due to technical issues directly caused by the platform. If you believe you are entitled to a refund, you must contact our support team within 7 days of the transaction date, providing complete details and proof of the issue. Refunds, if approved, will be processed within 7–14 business days via the original method of payment. Kadagam Venture Private Limited reserves the right to deny refund requests at its sole discretion and to revise this refund policy at any time.</li>
          </ul>
        </section>

        {/* Section 20 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">21. Contact Us </h2>
          <ul className="list-disc list-inside space-y-2">
            <li style={liStyle}>If </li>
            <li style={liStyle}>If you have any questions about this TERMS AND CONDITIONS & Privacy Policy, please contact us at</li>
            <ul className="list-disc list-inside pl-6 space-y-1">
              <li style={liStyle}>Email: [support@kadagamnext.com]</li>
              <li style={liStyle}>Address: [Kadagam Ventures Private Limited]</li>
              <li style={liStyle}>No : 34. Venkatappa Road Tasker Town</li>
              <li style={liStyle}>Off Queens Road, Bengaluru. 560051</li>
            </ul>
          </ul>
        </section>

      </div>
    </div>
  );
}
