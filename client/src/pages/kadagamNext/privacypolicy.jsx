
export default function PrivacyPolicyPage() {
    // common styles
    const baseText = {
        fontFamily: 'Josefin Sans !important',
        fontWeight: 400,
        fontSize: '22px',
        lineHeight: '33px',
        letterSpacing: '0%',
        textAlign: 'justify',
        color: 'rgba(142,141,147,1)'
    };
    const headingStyle = {
        ...baseText,
        fontFamily: 'Josefin Sans !important',
        fontWeight: 700,
        fontSize: '36px',
        lineHeight: '44px',
        color: '#FFF'
    };

    return (
        <div className="relative min-h-screen flex bg-black">
            <div className="w-full max-w-5xl mx-auto py-20 px-8">
                {/* Page Title */}
                {/* Main Title: split into white and gradient parts */}
                <h1 className="mb-12 text-center" style={{ fontFamily: 'Josefin Sans', fontWeight: 700, fontSize: '60px', lineHeight: '76px', letterSpacing: '0%', textTransform: 'capitalize' }}>
                    <span style={{ color: '#FFF' }}>Privacy </span>
                    <span style={{ background: 'linear-gradient(90deg, #F7F7F7 0%, #585554 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Policy
                    </span>
                </h1>

                {/* Section 1 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>1. What We Collect</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>User identifiers (Name, Email, Mobile)</li>
                        <li style={baseText}>Organizational data (business type, employee info)</li>
                        <li style={baseText}>Platform usage data (logs, interactions)</li>
                        <li style={baseText}>Financial information (for payroll & billing)</li>
                    </ul>
                </section>

                {/* Section 2 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>2. Why We Collect It</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>To operate task/project management tools</li>
                        <li style={baseText}>To process payroll & generate reports</li>
                        <li style={baseText}>For user authentication & security</li>
                        <li style={baseText}>To improve services and support</li>
                    </ul>
                </section>

                {/* Section 3 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>3. Data Sharing</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>We do not sell your data.</li>
                        <li style={baseText}>Data may be shared with:</li>
                        <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                            <li style={baseText}>Trusted payroll processors</li>
                            <li style={baseText}>Regulatory authorities (as required by law)</li>
                            <li style={baseText}>Kadagam Ventures Pvt Ltd internal teams</li>
                        </ul>
                    </ul>
                </section>

                {/* Section 4 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>4. Your Rights</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>Request a copy of your stored data</li>
                        <li style={baseText}>Request correction of inaccurate records.</li>
                        <li style={baseText}>Request account deletion (subject to legal compliance).</li>
                    </ul>
                </section>

                {/* Section 5 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>5. Security</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>We employ</li>
                        <li style={baseText}>SSL Encryption</li>
                        <li style={baseText}>Firewalls & access controls</li>
                        <li style={baseText}>Regular data backups</li>
                        <li style={baseText}>However, no method is 100% secure. We encourage strong passwords and confidential handling.</li>
                    </ul>
                </section>

                {/* Section 6 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>6. Cookies</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>Kadagam Next uses cookies to:</li>
                        <li style={baseText}>Maintain session states</li>
                        <li style={baseText}>Track usage for performance insights</li>
                        <li style={baseText}>You can disable cookies via browser settings, though some features may be impacted.</li>
                    </ul>
                </section>

                {/* Section 7 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>7. Retention</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>Business and HR data is retained as long as needed for operational, legal, or contractual purposes.</li>
                        <li style={baseText}>Upon account closure, key data may be retained securely for compliance</li>
                    </ul>
                </section>

                {/* Section 8 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>8. Policy Updates</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>This Privacy Policy may be updated. Users will be notified of significant changes via email or platform alerts.</li>
                        <li style={baseText}>Hosted on: Amazon Web Services (AWS), Asia Pacific (Mumbai) Region</li>
                    </ul>
                </section>

                {/* Section 9 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>9. Overview</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>Kadagam Next values your privacy and is committed to protecting your personal and business data. This Privacy Policy outlines how we collect, use, store, and safeguard your information when you use our services, in accordance with industry standards and applicable laws.</li>
                    </ul>
                </section>

                {/* Section 10 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>10. Information We Collect</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>personal Information: Name, email address, mobile number, designation, and organization details</li>
                        <li style={baseText}>Employment & Payroll Data: Employee roles, attendance, salary details, employment history.</li>
                        <li style={baseText}>Usage Data: IP address, browser type, access logs, usage activities within the platform.</li>
                    </ul>
                </section>

                {/* Section 11 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>11. Data Retention Policy</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>All user data (including personal, project, and payroll-related information) is stored for a maximum of 30 days from the date of creation or update. After 30 days, the data is permanently deleted from our servers unless otherwise required by legal or regulatory obligations.</li>
                        <li style={baseText}>It is the user&apas;s responsibility to export or back up required data within the 30-day retention period.</li>
                        <li style={baseText}></li>
                    </ul>
                </section>

                {/* Section 12 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>12. Data Hosting & Security</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>Our platform is securely hosted on Amazon Web Services (AWS), which adheres to global security and compliance standards including:</li>
                        <li style={baseText}>ISO/IEC 27001, 27017, and 27018</li>
                        <li style={baseText}>SOC 1, SOC 2, and SOC 3 reports</li>
                        <li style={baseText}>GDPR and CCPA compliance frameworks</li>
                        <li style={baseText}>Security measures include:</li>
                        <li style={baseText}>Encrypted data transmission (HTTPS/SSL)</li>
                        <li style={baseText}>Firewall and intrusion detection systems</li>
                        <li style={baseText}>Role-based access controls (RBAC)</li>
                        <li style={baseText}>Daily server monitoring and vulnerability checks</li>
                    </ul>
                </section>

                {/* Section 13  */}
                <section className="mb-8">
                    <h2 style={headingStyle}>13. Third-Party Sharing</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>We do not sell or trade user data.</li>
                        <li style={baseText}>Limited sharing may occur:</li>
                        <li style={baseText}>With trusted service providers (e.g., cloud storage, payment gateway) under confidentiality agreements</li>
                        <li style={baseText}>If required by law, court order, or regulatory authorities</li>
                    </ul>
                </section>

                {/* Section 14 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>14. User Rights</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>You have the right to:</li>
                        <li style={baseText}>Access or request a copy of your data (within 30 days)</li>
                        <li style={baseText}>Request deletion or correction of data</li>
                        <li style={baseText}>Revoke access and close your account</li>
                        <li style={baseText}>To exercise your rights, contact us at: privacy@kadagamnext.com</li>
                    </ul>
                </section>

                {/* Section 15 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>15. Cookies</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>Kadagam Next uses cookies to:</li>
                        <li style={baseText}>Maintain session states</li>
                        <li style={baseText}>Analyze platform usage and improve performance</li>
                        <li style={baseText}>You can control cookie preferences via your browser settings.</li>
                    </ul>
                </section>

                {/* Section 16 */}
                <section className="mb-8">
                    <h2 style={headingStyle}>16. Updates to the Privacy Policy</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>This policy may be updated periodically. Users will be notified of major changes via platform alerts or email. Continued use of the platform indicates acceptance of the updated policy.</li>
                    </ul>
                </section>

                {/* Section contact information */}
                <section className="mb-8">
                    <h2 style={headingStyle}>Contact Information</h2>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li style={baseText}>For privacy-related questions or data requests, please contact:	privacy@kadagamnext.com</li>
                        <li style={baseText}>Address: [Kadagam Ventures Private Limited] ,No : 34. Venkatappa Road Tasker Town,Off Queens Road, Bengaluru. 560051</li>

                    </ul>
                </section>

            </div>
        </div>
    );
}
