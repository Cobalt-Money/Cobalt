import { createFileRoute } from "@tanstack/react-router";

import { MarketingFooter, MarketingNav } from "@/components/landing/marketing-shell";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  component: TermsOfService,
  head: () => {
    const seo = buildSeoMeta({
      description: "Cobalt terms of service.",
      path: "/terms",
      title: "Terms of Service",
    });
    return { links: seo.links, meta: seo.meta };
  },
  staticData: { title: "Terms of Service" },
});

function TermsOfService() {
  return (
    <main className="flex flex-col">
      <MarketingNav />
      <div className="container mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-lg text-muted-foreground mb-2">Cobalt Personal Finance Inc.</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-foreground/85 mb-8">
            <strong>Effective Date:</strong> November 1, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. ACCEPTANCE OF TERMS</h2>
            <p className="text-foreground/85 mb-4">
              These Terms of Service ("Terms") constitute a legally binding agreement between you
              and Cobalt Personal Finance Inc. ("Cobalt," "we," "us," or "our") governing your
              access to and use of our personal finance management platform and related services
              (collectively, the "Services").
            </p>
            <p className="text-foreground/85 mb-4">
              By creating an account, accessing, or using the Services, you acknowledge that you
              have read, understood, and agree to be bound by these Terms and our Privacy Policy,
              which is incorporated herein by reference. If you do not agree to these Terms, you
              must not access or use the Services.
            </p>
            <p className="text-foreground/85 mb-4">
              We reserve the right to modify these Terms at any time. Your continued use of the
              Services after any such modifications constitutes your acceptance of the revised
              Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. ELIGIBILITY</h2>
            <p className="text-foreground/85 mb-4">
              You must be at least eighteen (18) years of age to use the Services. By using the
              Services, you represent and warrant that:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>You are at least 18 years old</li>
              <li>You have the legal capacity to enter into these Terms</li>
              <li>You are not prohibited from using the Services under any applicable law</li>
              <li>All information you provide to us is accurate, current, and complete</li>
            </ul>
            <p className="text-foreground/85 mb-4">
              If you are accessing the Services on behalf of an organization, you represent and
              warrant that you have the authority to bind that organization to these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. DESCRIPTION OF SERVICE</h2>
            <p className="text-foreground/85 mb-4">
              Cobalt is a personal finance management platform that provides AI-powered insights,
              account aggregation, transaction tracking, and financial planning tools. Our Services
              include:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>
                Secure, read-only connection to your financial accounts through authorized
                third-party services
              </li>
              <li>
                Aggregation and display of your financial data, including account balances,
                transactions, and transaction history
              </li>
              <li>
                AI-powered financial analysis, spending pattern identification, and personalized
                recommendations
              </li>
              <li>Conversational AI interface for querying and analyzing your financial data</li>
              <li>Document storage and organization for financial records</li>
              <li>Financial tracking, budgeting tools, and analytics</li>
              <li>Data visualization and reporting features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. NO FINANCIAL TRANSACTION AUTHORITY</h2>
            <p className="text-foreground/85 mb-4">
              <strong>IMPORTANT LIMITATION:</strong> Cobalt is a financial information and analysis
              platform only. We do NOT:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Process, execute, facilitate, or authorize any financial transactions</li>
              <li>Transfer funds between accounts</li>
              <li>Make payments on your behalf</li>
              <li>Modify account balances or settings at financial institutions</li>
              <li>Act as a bank, broker, investment advisor, or financial institution</li>
            </ul>
            <p className="text-foreground/85 mb-4">
              Our Services are designed exclusively to help you view, track, analyze, and manage
              your financial information. All financial transactions, including payments, transfers,
              deposits, withdrawals, and account modifications, must be conducted directly through
              your financial institutions or their authorized platforms.
            </p>
            <p className="text-foreground/85 mb-4">
              We maintain read-only access to your financial accounts through authorized third-party
              connection services and cannot and will not initiate any transactions on your behalf.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. AI SERVICES AND DISCLAIMERS</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.1 AI-Powered Features</h3>
            <p className="text-foreground/85 mb-4">
              Our Services utilize artificial intelligence and machine learning technologies,
              including third-party AI models from Anthropic Claude and Alibaba Qwen, to provide:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Spending pattern analysis and categorization</li>
              <li>Conversational interface for financial data queries</li>
              <li>Predictive analytics and forecasting</li>
              <li>Anomaly detection and alerts</li>
              <li>Personalized recommendations and insights</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              5.2 Not Financial, Investment, or Tax Advice
            </h3>
            <p className="text-foreground/85 mb-4">
              <strong>CRITICAL DISCLAIMER:</strong> All AI-generated insights, recommendations,
              analyses, predictions, and suggestions provided through the Services are for
              informational and educational purposes only and do NOT constitute:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Professional financial advice</li>
              <li>Investment recommendations or guidance</li>
              <li>Tax advice or tax planning services</li>
              <li>Legal advice</li>
              <li>Accounting services</li>
              <li>Any form of licensed professional services</li>
            </ul>
            <p className="text-foreground/85 mb-4">
              You should NOT rely solely on AI-generated content for making significant financial,
              investment, tax, or legal decisions. We strongly recommend that you:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Independently verify all AI-generated information</li>
              <li>
                Consult with qualified, licensed financial advisors, accountants, tax professionals,
                or attorneys before making important financial decisions
              </li>
              <li>Conduct your own research and due diligence</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.3 AI Limitations and Errors</h3>
            <p className="text-foreground/85 mb-4">You acknowledge and agree that:</p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>AI systems may produce errors, inaccuracies, or unexpected results</li>
              <li>AI-generated content should be reviewed and verified independently</li>
              <li>
                We do not guarantee the accuracy, completeness, or reliability of AI-generated
                insights
              </li>
              <li>
                AI recommendations are based on patterns in your data and may not account for all
                relevant factors
              </li>
              <li>Past performance and patterns do not guarantee future results</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. THIRD-PARTY SERVICES</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              6.1 Financial Account Connection Services
            </h3>
            <p className="text-foreground/85 mb-4">
              To connect your financial accounts to our platform, we utilize authorized third-party
              financial data aggregation services, including:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Plaid Inc.</li>
              <li>Snaptrade</li>
            </ul>
            <p className="text-foreground/85 mb-4">
              By using our Services, you acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>
                You provide your financial institution credentials directly to these third-party
                services, not to Cobalt
              </li>
              <li>These services are subject to their own terms of service and privacy policies</li>
              <li>
                We do not store, retain, or have access to your banking login credentials or
                passwords
              </li>
              <li>
                Your use of these services is governed by their respective agreements with you
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.2 AI Service Providers</h3>
            <p className="text-foreground/85 mb-4">
              We utilize third-party AI models and services, including Anthropic Claude and Alibaba
              Qwen, to power certain AI features. Your financial data may be transmitted to these
              providers in accordance with our Privacy Policy and their respective data handling
              practices.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.3 No Endorsement or Liability</h3>
            <p className="text-foreground/85 mb-4">
              We do not endorse, guarantee, or assume responsibility for any third-party services,
              products, or content. Your use of third-party services is at your sole risk, and you
              should review their terms and privacy policies before use.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. USER RESPONSIBILITIES AND CONDUCT</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">7.1 Account Security</h3>
            <p className="text-foreground/85 mb-4">You are responsible for:</p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>
                Maintaining the confidentiality of your account credentials and login information
              </li>
              <li>Using strong, unique passwords</li>
              <li>All activities that occur under your account</li>
              <li>Promptly notifying us of any unauthorized access or security breach</li>
              <li>Logging out of your account when using shared or public devices</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">7.2 Accurate Information</h3>
            <p className="text-foreground/85 mb-4">
              You agree to provide accurate, current, and complete information when creating your
              account and using the Services, and to promptly update such information to maintain
              its accuracy.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">7.3 Prohibited Conduct</h3>
            <p className="text-foreground/85 mb-4">You agree NOT to:</p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>
                Use the Services for any illegal purpose or in violation of any applicable laws or
                regulations
              </li>
              <li>
                Attempt to gain unauthorized access to our systems, networks, or other users'
                accounts
              </li>
              <li>
                Interfere with or disrupt the Services or servers or networks connected to the
                Services
              </li>
              <li>
                Use any automated systems (bots, scrapers, etc.) to access the Services without our
                prior written permission
              </li>
              <li>Reverse engineer, decompile, or disassemble any portion of the Services</li>
              <li>
                Remove, circumvent, disable, damage, or interfere with security-related features
              </li>
              <li>Transmit any viruses, malware, or other malicious code</li>
              <li>Violate the rights of others, including intellectual property rights</li>
              <li>
                Impersonate any person or entity or misrepresent your affiliation with any person or
                entity
              </li>
              <li>
                Use the Services to transmit spam, chain letters, or other unsolicited
                communications
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. USER CONTENT AND DATA</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.1 Your Data</h3>
            <p className="text-foreground/85 mb-4">
              You retain all ownership rights to the financial data, documents, and other content
              you upload, store, or generate through the Services ("User Content"). By providing
              User Content to the Services, you grant us a limited, non-exclusive, royalty-free
              license to use, store, process, and display such content solely for the purpose of
              providing and improving the Services.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.2 Data Accuracy</h3>
            <p className="text-foreground/85 mb-4">
              While we strive to provide accurate financial data through our third-party connection
              services, we do not guarantee the accuracy, completeness, or timeliness of financial
              information obtained from third-party sources. You are responsible for verifying the
              accuracy of all financial data displayed in the Services.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.3 Data Backup</h3>
            <p className="text-foreground/85 mb-4">
              While we implement backup procedures, you are solely responsible for maintaining
              independent backups of important financial documents and records. We are not
              responsible for any loss or corruption of User Content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. INTELLECTUAL PROPERTY</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.1 Cobalt's Ownership</h3>
            <p className="text-foreground/85 mb-4">
              The Services, including all software, technology, features, functionality, content,
              designs, graphics, interfaces, and trademarks, are owned by Cobalt Personal Finance
              Inc. and are protected by United States and international copyright, trademark,
              patent, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.2 Limited License</h3>
            <p className="text-foreground/85 mb-4">
              Subject to your compliance with these Terms, we grant you a limited, non-exclusive,
              non-transferable, revocable license to access and use the Services for your personal,
              non-commercial use. This license does not include any right to:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Modify, copy, or create derivative works of the Services</li>
              <li>Distribute, sell, lease, or sublicense the Services</li>
              <li>Use the Services for any commercial purpose without our written consent</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.3 Feedback</h3>
            <p className="text-foreground/85 mb-4">
              If you provide us with any feedback, suggestions, or ideas regarding the Services, you
              grant us an unrestricted, perpetual, irrevocable, royalty-free license to use, modify,
              and incorporate such feedback into our Services without any obligation to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. DATA AND PRIVACY</h2>
            <p className="text-foreground/85 mb-4">
              Your privacy is important to us. We collect, use, and protect your information as
              described in our Privacy Policy. By using the Services, you consent to the collection,
              use, and sharing of information in accordance with our Privacy Policy.
            </p>
            <p className="text-foreground/85 mb-4">
              Please review our Privacy Policy at{" "}
              <a href="/privacy" className="text-blue-400 hover:text-blue-300">
                https://cobaltpf.com/privacy
              </a>{" "}
              to understand our data practices, including:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>What information we collect and how we use it</li>
              <li>How AI features process your financial data</li>
              <li>Third-party services that access your information</li>
              <li>Your privacy rights and data retention policies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. DISCLAIMERS AND WARRANTIES</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">11.1 "AS IS" Service</h3>
            <p className="text-foreground/85 mb-4">
              THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">11.2 No Guarantee of Accuracy</h3>
            <p className="text-foreground/85 mb-4">WE DO NOT WARRANT OR GUARANTEE:</p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>
                The accuracy, completeness, reliability, or timeliness of any information, content,
                or data provided through the Services
              </li>
              <li>That the Services will be uninterrupted, timely, secure, or error-free</li>
              <li>That defects will be corrected</li>
              <li>That the Services are free from viruses or other harmful components</li>
              <li>The results obtained from using the Services</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">11.3 Third-Party Data</h3>
            <p className="text-foreground/85 mb-4">
              Financial data obtained from third-party services may be delayed, inaccurate, or
              incomplete. We are not responsible for errors or omissions in data provided by
              third-party financial institutions or data aggregation services.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">11.4 Your Sole Risk</h3>
            <p className="text-foreground/85 mb-4">
              YOU ACKNOWLEDGE AND AGREE THAT YOUR USE OF THE SERVICES IS AT YOUR SOLE RISK AND THAT
              YOU WILL BE SOLELY RESPONSIBLE FOR ANY DAMAGE TO YOUR DEVICE, LOSS OF DATA, OR OTHER
              HARM RESULTING FROM YOUR USE OF THE SERVICES.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. LIMITATION OF LIABILITY</h2>
            <p className="text-foreground/85 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
            </p>
            <p className="text-foreground/85 mb-4">
              IN NO EVENT SHALL COBALT PERSONAL FINANCE INC., ITS OFFICERS, DIRECTORS, EMPLOYEES,
              AGENTS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Lost profits, revenue, or data</li>
              <li>Loss of business or business opportunity</li>
              <li>
                Financial losses resulting from decisions made based on information provided through
                the Services
              </li>
              <li>Losses resulting from unauthorized access to your account</li>
              <li>
                Damages arising from errors, omissions, interruptions, deletions, defects, delays in
                operation or transmission, or any failure of performance
              </li>
            </ul>
            <p className="text-foreground/85 mb-4">
              WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), PRODUCT LIABILITY,
              OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT COBALT HAS BEEN ADVISED OF THE
              POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="text-foreground/85 mb-4">
              IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL DAMAGES, LOSSES, AND CAUSES OF
              ACTION EXCEED THE AMOUNT YOU HAVE PAID TO COBALT IN THE TWELVE (12) MONTHS PRECEDING
              THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
            <p className="text-foreground/85 mb-4">
              SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF INCIDENTAL OR
              CONSEQUENTIAL DAMAGES, SO THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. INDEMNIFICATION</h2>
            <p className="text-foreground/85 mb-4">
              You agree to indemnify, defend, and hold harmless Cobalt Personal Finance Inc., its
              officers, directors, employees, agents, suppliers, and licensors from and against any
              and all claims, liabilities, damages, losses, costs, expenses, or fees (including
              reasonable attorneys' fees) arising from:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Your use or misuse of the Services</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Your violation of any applicable laws or regulations</li>
              <li>Any User Content you provide</li>
              <li>Any decisions you make based on information provided through the Services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              14. SERVICE AVAILABILITY AND MODIFICATIONS
            </h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">14.1 Service Availability</h3>
            <p className="text-foreground/85 mb-4">
              We strive to maintain high service availability but do not guarantee uninterrupted or
              error-free access to the Services. We may temporarily suspend, restrict, or terminate
              access to all or part of the Services for:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Scheduled or emergency maintenance</li>
              <li>Technical issues or system upgrades</li>
              <li>Security concerns</li>
              <li>Compliance with legal requirements</li>
              <li>Any other operational reasons</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">14.2 Modifications to Services</h3>
            <p className="text-foreground/85 mb-4">
              We reserve the right to modify, suspend, or discontinue any aspect of the Services at
              any time, with or without notice. We shall not be liable to you or any third party for
              any modification, suspension, or discontinuation of the Services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. TERMINATION</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">15.1 Termination by You</h3>
            <p className="text-foreground/85 mb-4">
              You may terminate your account at any time by:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Using the account deletion feature in your account settings, or</li>
              <li>Contacting us at feedback@try-cobalt.com</li>
            </ul>
            <p className="text-foreground/85 mb-4">
              Upon termination, your personal data will be deleted in accordance with our Privacy
              Policy (typically within 30 days).
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">15.2 Termination by Cobalt</h3>
            <p className="text-foreground/85 mb-4">
              We reserve the right to suspend or terminate your account and access to the Services
              immediately, without prior notice or liability, for any reason, including but not
              limited to:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Violation of these Terms</li>
              <li>Fraudulent, abusive, or illegal activity</li>
              <li>Requests by law enforcement or government agencies</li>
              <li>Extended periods of inactivity</li>
              <li>Technical or security issues</li>
              <li>Discontinuation of the Services</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">15.3 Effect of Termination</h3>
            <p className="text-foreground/85 mb-4">Upon termination:</p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Your right to access and use the Services will immediately cease</li>
              <li>
                We may delete your account and User Content in accordance with our Privacy Policy
              </li>
              <li>
                Sections of these Terms that by their nature should survive termination shall
                survive, including ownership provisions, warranty disclaimers, indemnity, and
                limitations of liability
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              16. GOVERNING LAW AND DISPUTE RESOLUTION
            </h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">16.1 Governing Law</h3>
            <p className="text-foreground/85 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the
              State of New York, United States, without regard to its conflict of law provisions.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">16.2 Dispute Resolution</h3>
            <p className="text-foreground/85 mb-4">
              Any dispute, claim, or controversy arising out of or relating to these Terms or the
              Services shall be resolved through:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>
                <strong>Informal Resolution:</strong> You agree to first contact us at
                feedback@try-cobalt.com to attempt to resolve any dispute informally
              </li>
              <li>
                <strong>Jurisdiction:</strong> If informal resolution is unsuccessful, you agree
                that any legal action or proceeding shall be brought exclusively in the federal or
                state courts located in New York County, New York, and you consent to the personal
                jurisdiction of such courts
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">16.3 Class Action Waiver</h3>
            <p className="text-foreground/85 mb-4">
              YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN
              INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. If for
              any reason a claim proceeds in court rather than through alternative dispute
              resolution, you and Cobalt each waive any right to a jury trial.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">17. GENERAL PROVISIONS</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">17.1 Entire Agreement</h3>
            <p className="text-foreground/85 mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement between
              you and Cobalt regarding the Services and supersede all prior agreements and
              understandings.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">17.2 Severability</h3>
            <p className="text-foreground/85 mb-4">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining
              provisions shall remain in full force and effect.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">17.3 Waiver</h3>
            <p className="text-foreground/85 mb-4">
              Our failure to enforce any right or provision of these Terms shall not be deemed a
              waiver of such right or provision.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">17.4 Assignment</h3>
            <p className="text-foreground/85 mb-4">
              You may not assign or transfer these Terms or your rights hereunder without our prior
              written consent. We may assign these Terms without restriction.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">17.5 No Agency</h3>
            <p className="text-foreground/85 mb-4">
              No agency, partnership, joint venture, or employment relationship is created between
              you and Cobalt as a result of these Terms or your use of the Services.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">17.6 Force Majeure</h3>
            <p className="text-foreground/85 mb-4">
              We shall not be liable for any failure to perform our obligations under these Terms
              where such failure results from circumstances beyond our reasonable control, including
              acts of God, natural disasters, war, terrorism, riots, pandemics, labor disputes, or
              governmental actions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">18. CHANGES TO TERMS</h2>
            <p className="text-foreground/85 mb-4">
              We reserve the right to modify these Terms at any time. When we make changes, we will:
            </p>
            <ul className="list-disc list-inside text-foreground/85 mb-4 space-y-1">
              <li>Update the "Effective Date" at the top of these Terms</li>
              <li>
                Provide notice of material changes through the Services, by email, or other
                appropriate means
              </li>
              <li>Obtain your consent if required by applicable law</li>
            </ul>
            <p className="text-foreground/85 mb-4">
              Your continued use of the Services after any modifications to these Terms constitutes
              your acceptance of the revised Terms. If you do not agree to the modified Terms, you
              must stop using the Services and terminate your account.
            </p>
            <p className="text-foreground/85 mb-4">
              We encourage you to review these Terms periodically to stay informed of any changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">19. CONTACT INFORMATION</h2>
            <p className="text-foreground/85 mb-4">
              If you have any questions, concerns, or requests regarding these Terms of Service,
              please contact us:
            </p>
            <div className="text-foreground/85 mb-4">
              <p className="font-semibold">Cobalt Personal Finance Inc.</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:feedback@try-cobalt.com"
                  className="text-blue-400 hover:text-blue-300"
                >
                  feedback@try-cobalt.com
                </a>
              </p>
              <p className="mt-2">Mailing Address:</p>
              <p className="ml-4">Cobalt Personal Finance Inc.</p>
              <p className="ml-4">Legal Department</p>
              <p className="ml-4">35 W 15th St, Apt 17A</p>
              <p className="ml-4">New York, NY 10011</p>
            </div>
          </section>

          <p className="mt-12 text-muted-foreground text-sm">
            © 2025 Cobalt Personal Finance Inc. All rights reserved.
          </p>
        </div>
      </div>
      <MarketingFooter />
    </main>
  );
}
