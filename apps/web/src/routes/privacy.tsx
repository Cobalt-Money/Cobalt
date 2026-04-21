import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicy,
  staticData: { title: "Privacy Policy" },
});

function PrivacyPolicy() {
  return (
    <div className="h-svh overflow-y-auto bg-black text-white">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold font-manrope mb-8">Privacy Policy</h1>
        <p className="text-lg text-gray-400 mb-2">
          Cobalt Personal Finance Inc.
        </p>

        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-8">
            <strong>Effective Date:</strong> November 1, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              1. INTRODUCTION
            </h2>
            <p className="text-gray-300 mb-4">
              Cobalt Personal Finance Inc. ("Cobalt," "we," "us," or "our") is
              committed to protecting the privacy and security of your personal
              information. This Privacy Policy describes how we collect, use,
              disclose, and safeguard your information when you use our personal
              finance management platform and related services (collectively,
              the "Services").
            </p>
            <p className="text-gray-300 mb-4">
              By accessing or using our Services, you acknowledge that you have
              read, understood, and agree to be bound by this Privacy Policy. If
              you do not agree with the terms of this Privacy Policy, please do
              not access or use the Services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              2. INFORMATION WE COLLECT
            </h2>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              2.1 Information You Provide to Us
            </h3>
            <p className="text-gray-300 mb-4">
              We collect information that you voluntarily provide to us when
              you:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>Create and maintain an account with Cobalt</li>
              <li>Connect your financial accounts to our Services</li>
              <li>Use our platform features and tools</li>
              <li>Contact us for customer support or inquiries</li>
              <li>Participate in surveys or promotional activities</li>
              <li>Communicate with us through any channel</li>
            </ul>
            <p className="text-gray-300 mb-4">This information may include:</p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                <strong>Identity Information:</strong> Full name, email address,
                phone number, and date of birth
              </li>
              <li>
                <strong>Financial Account Information:</strong> Financial
                institution names, account types, account balances, transaction
                history, and related financial data (obtained securely through
                authorized third-party connection services)
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you interact
                with our Services, including features accessed, preferences set,
                and time spent on the platform
              </li>
              <li>
                <strong>Communication Records:</strong> Records of your
                correspondence with our support team, including emails, chat
                logs, and feedback submissions
              </li>
              <li>
                <strong>Technical Information:</strong> Device information, IP
                address, browser type, and operating system
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              2.2 Automatically Collected Information
            </h3>
            <p className="text-gray-300 mb-4">
              When you access our Services, we may automatically collect certain
              information, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>Log data and analytics regarding your use of the Services</li>
              <li>Device identifiers and network information</li>
              <li>
                Cookies and similar tracking technologies (as described in our
                Cookie Policy)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              3. HOW WE USE YOUR INFORMATION
            </h2>
            <p className="text-gray-300 mb-4">
              Cobalt uses the collected information for the following purposes:
            </p>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              3.1 Service Provision and Enhancement
            </h3>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                To provide, operate, maintain, and improve our personal finance
                management platform
              </li>
              <li>
                To display your aggregated financial data, account balances, and
                transaction histories
              </li>
              <li>
                To generate personalized financial insights, analytics, and
                visualizations
              </li>
              <li>
                To develop new features and functionality for the Services
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              3.2 Communication and Support
            </h3>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                To send you technical notices, security alerts, and system
                updates
              </li>
              <li>
                To respond to your inquiries, comments, and support requests
              </li>
              <li>To provide customer service and resolve technical issues</li>
              <li>
                To send you information about changes to our Services or
                policies
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              3.3 Personalization
            </h3>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                To personalize and customize your experience with our Services
              </li>
              <li>
                To understand your financial management needs and preferences
              </li>
              <li>To deliver relevant content and recommendations</li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              3.4 Security and Compliance
            </h3>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                To monitor and analyze usage patterns for security purposes
              </li>
              <li>
                To detect, prevent, and address technical issues, fraud, and
                unauthorized access
              </li>
              <li>
                To comply with legal obligations and enforce our Terms of
                Service
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              3.5 Important Limitation
            </h3>
            <p className="text-gray-300 mb-4">
              Cobalt does not process, facilitate, execute, or authorize any
              financial transactions. Our Services are designed exclusively to
              help you view, track, analyze, and manage your financial
              information. All financial transactions, including payments,
              transfers, and account modifications, must be conducted directly
              through your financial institutions or their authorized platforms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              4. ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING
            </h2>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              4.1 AI-Powered Features
            </h3>
            <p className="text-gray-300 mb-4">
              Cobalt utilizes artificial intelligence (AI) and machine learning
              technologies to enhance your experience and provide intelligent
              financial insights. Our AI-powered features include:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                <strong>Spending Pattern Analysis:</strong> Examination of your
                transaction data to identify spending habits, trends, and
                categories
              </li>
              <li>
                <strong>Conversational Interface:</strong> AI-powered chat
                functionality to answer questions about your financial data and
                provide guidance
              </li>
              <li>
                <strong>Predictive Analytics:</strong> Generation of financial
                forecasts, budget projections, and cash flow predictions based
                on your historical data
              </li>
              <li>
                <strong>Anomaly Detection:</strong> Identification of unusual
                transactions, spending spikes, or potential issues requiring
                your attention
              </li>
              <li>
                <strong>Personalized Recommendations:</strong> Customized
                suggestions for budgeting, saving, and financial management
                based on your unique financial profile
              </li>
              <li>
                <strong>Continuous Improvement:</strong> Enhancement of model
                accuracy and relevance through systematic evaluation of system
                performance
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              4.2 Your Data and AI Model Training
            </h3>
            <p className="text-gray-300 mb-4">
              We are committed to protecting the privacy of your financial
              information in relation to our AI systems:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                <strong>No Cross-Customer Training:</strong> Your personal
                financial data is never used to train AI models for deployment
                to other customers or users
              </li>
              <li>
                <strong>Account Privacy:</strong> Your financial conversations,
                transactions, and data remain strictly private to your account
              </li>
              <li>
                <strong>Aggregated Insights Only:</strong> Any improvements to
                our AI models based on user interactions are implemented at an
                aggregate, anonymized system level that does not expose or share
                individual user patterns, behaviors, or information
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              4.3 Third-Party AI Service Providers
            </h3>
            <p className="text-gray-300 mb-4">
              To power certain AI features, we utilize third-party AI models and
              services, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>Anthropic (Claude) — provided by Anthropic, PBC</li>
              <li>Google (Gemini) — provided by Google LLC</li>
            </ul>
            <p className="text-gray-300 mb-4">
              <strong>What Data Is Sent to Third-Party AI Providers:</strong>
            </p>
            <p className="text-gray-300 mb-4">
              When you use AI-powered features such as the conversational
              interface or financial insights, the following data may be
              transmitted to the third-party AI providers listed above:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                Your chat messages, questions, and prompts entered into the
                conversational interface
              </li>
              <li>Transaction descriptions, amounts, dates, and categories</li>
              <li>Account names, types, and balances</li>
              <li>
                Spending patterns and financial summaries generated from your
                connected accounts
              </li>
            </ul>
            <p className="text-gray-300 mb-4">
              <strong>Zero Data Retention (ZDR):</strong>
            </p>
            <p className="text-gray-300 mb-4">
              We access all third-party AI services through infrastructure that
              enforces zero data retention (ZDR). This means:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                Your data is transmitted to these providers solely for real-time
                processing of your specific request
              </li>
              <li>
                Your data is not stored, retained, or persisted by these
                providers after your request is fulfilled
              </li>
              <li>
                Your data is not used for training, fine-tuning, or improving
                these providers&apos; AI models
              </li>
              <li>
                All data is transmitted using secure, encrypted connections
                (TLS/SSL)
              </li>
            </ul>
            <p className="text-gray-300 mb-4">
              <strong>Third-Party Provider Obligations:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                All third-party AI providers are contractually bound to maintain
                the confidentiality and security of your information
              </li>
              <li>
                Each provider is required to provide the same or equal
                protection of your data as described in this Privacy Policy
              </li>
              <li>
                We carefully vet all AI service providers to ensure they meet
                our stringent privacy and security standards
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              4.4 AI Transparency and Limitations
            </h3>
            <p className="text-gray-300 mb-4">
              <strong>Important Disclosures:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                <strong>Not Financial Advice:</strong> AI-generated insights,
                recommendations, and analyses are provided for informational and
                educational purposes only and do not constitute professional
                financial advice, investment recommendations, or tax guidance
              </li>
              <li>
                <strong>Verification Recommended:</strong> We strongly encourage
                you to independently verify all AI-generated information and
                consult with qualified financial advisors, accountants, or other
                licensed professionals before making significant financial
                decisions
              </li>
              <li>
                <strong>Explanation Available:</strong> You may contact us at
                any time to understand how AI was utilized in generating any
                particular recommendation, insight, or analysis
              </li>
              <li>
                <strong>Human Oversight:</strong> While our AI systems are
                sophisticated, they may occasionally produce errors or
                unexpected results. We continuously monitor and improve our AI
                functionality
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              4.5 Your AI-Related Rights
            </h3>
            <p className="text-gray-300 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                Request information about how AI was used in any specific
                recommendation or insight
              </li>
              <li>
                Provide feedback on AI-generated content to help us improve
                accuracy and relevance
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              5. DATA SECURITY
            </h2>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              5.1 Security Measures
            </h3>
            <p className="text-gray-300 mb-4">
              Cobalt implements comprehensive administrative, technical, and
              physical security measures designed to protect your personal
              information against unauthorized access, alteration, disclosure,
              destruction, or loss. These measures include:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                <strong>Encryption:</strong> Industry-standard encryption
                protocols (including TLS/SSL) for data in transit and at rest
              </li>
              <li>
                <strong>Access Controls:</strong> Role-based access restrictions
                limiting employee access to personal information on a
                need-to-know basis
              </li>
              <li>
                <strong>Authentication:</strong> Multi-factor authentication
                options and strong password requirements
              </li>
              <li>
                <strong>Security Audits:</strong> Regular internal and
                third-party security assessments, vulnerability testing, and
                penetration testing
              </li>
              <li>
                <strong>Monitoring:</strong> Continuous monitoring systems to
                detect and respond to potential security incidents
              </li>
              <li>
                <strong>Incident Response:</strong> Established procedures for
                responding to and mitigating security breaches
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              5.2 Third-Party Security
            </h3>
            <p className="text-gray-300 mb-4">
              We carefully select third-party service providers and require them
              to maintain security standards consistent with industry best
              practices and applicable regulations.
            </p>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              5.3 Your Responsibility
            </h3>
            <p className="text-gray-300 mb-4">
              While we implement robust security measures, the security of your
              account also depends on your actions. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                Maintaining the confidentiality of your account credentials
              </li>
              <li>Using strong, unique passwords</li>
              <li>
                Promptly notifying us of any unauthorized access or security
                concerns
              </li>
              <li>Logging out of your account when using shared devices</li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              5.4 No Guarantee
            </h3>
            <p className="text-gray-300 mb-4">
              Despite our security efforts, no system is completely secure. We
              cannot guarantee absolute security of your information, and you
              use our Services at your own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              6. DATA RETENTION
            </h2>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              6.1 Active Account Data
            </h3>
            <p className="text-gray-300 mb-4">
              While your account remains active, we retain the following
              information to provide and improve our Services:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                All connected financial account information and transaction data
              </li>
              <li>
                Account settings, preferences, and user profile information
              </li>
              <li>Usage history and interaction logs</li>
              <li>Communication records with customer support</li>
            </ul>
            <p className="text-gray-300 mb-4">
              You maintain control over your data and may:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                Delete specific financial account connections at any time
                through your account settings
              </li>
              <li>
                Modify sync preferences to control how frequently financial data
                is updated
              </li>
              <li>
                Remove individual transactions or categories of data as
                permitted by the platform
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              6.2 Account Deletion
            </h3>
            <p className="text-gray-300 mb-4">
              Upon your request to delete your account:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                <strong>Initial Deletion (30 Days):</strong> We will permanently
                delete your personal information, including financial data,
                account details, and user-generated content, within thirty (30)
                days of your deletion request
              </li>
              <li>
                <strong>Irreversibility:</strong> Once the deletion process is
                complete, your data cannot be recovered, restored, or reinstated
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              6.3 Legal and Compliance Retention
            </h3>
            <p className="text-gray-300 mb-4">
              Notwithstanding the above, we may retain certain categories of
              information for extended periods when required by law, regulatory
              obligations, or legitimate business purposes:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                <strong>Transaction Logs and Security Records:</strong> Retained
                for up to seven (7) years for fraud prevention, security
                investigations, financial auditing, and legal compliance
                purposes
              </li>
              <li>
                <strong>Communication Records:</strong> Customer support
                tickets, emails, and other communications retained for up to
                three (3) years for quality assurance, training, dispute
                resolution, and legal purposes
              </li>
              <li>
                <strong>Legal Obligations:</strong> Information retained as
                required by applicable laws, regulations, court orders, or
                government requests
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              7. THIRD-PARTY SERVICES AND DATA SHARING
            </h2>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              7.1 Financial Account Connection Services
            </h3>
            <p className="text-gray-300 mb-4">
              To enable you to connect your financial accounts to our platform,
              we utilize secure, industry-leading third-party financial data
              aggregation services, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>Plaid Inc.</li>
              <li>Snaptrade</li>
            </ul>
            <p className="text-gray-300 mb-4">
              <strong>How These Services Work:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                These services establish read-only connections to your financial
                institutions
              </li>
              <li>
                You authorize these connections by providing your financial
                institution credentials directly to the third-party service (not
                to Cobalt)
              </li>
              <li>
                We do not store, retain, or have access to your banking login
                credentials or passwords
              </li>
              <li>
                These services retrieve your financial data (account balances,
                transactions, account details) and securely transmit it to
                Cobalt for display within our platform
              </li>
              <li>
                Each third-party service is subject to its own privacy policy
                and security standards, which we encourage you to review
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              7.2 Service Providers
            </h3>
            <p className="text-gray-300 mb-4">
              We may share your information with trusted third-party service
              providers who assist us in operating our Services, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>Cloud hosting and infrastructure providers</li>
              <li>Analytics and performance monitoring services</li>
              <li>Customer support and communication platforms</li>
              <li>Security and fraud prevention services</li>
            </ul>
            <p className="text-gray-300 mb-4">
              These service providers are contractually obligated to:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                Use your information only for the specific purposes we authorize
              </li>
              <li>
                Maintain the confidentiality and security of your information
              </li>
              <li>Comply with applicable data protection laws</li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              7.3 Business Transfers
            </h3>
            <p className="text-gray-300 mb-4">
              In the event of a merger, acquisition, reorganization, bankruptcy,
              or sale of assets, your information may be transferred as part of
              that transaction. We will provide notice and obtain consent as
              required by applicable law before your information becomes subject
              to a different privacy policy.
            </p>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              7.4 Legal Requirements
            </h3>
            <p className="text-gray-300 mb-4">
              We may disclose your information when we believe in good faith
              that disclosure is necessary to:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                Comply with applicable laws, regulations, legal processes, or
                governmental requests
              </li>
              <li>Enforce our Terms of Service or other agreements</li>
              <li>
                Protect the rights, property, or safety of Cobalt, our users, or
                the public
              </li>
              <li>
                Detect, prevent, or address fraud, security, or technical issues
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              7.5 With Your Consent
            </h3>
            <p className="text-gray-300 mb-4">
              We may share your information with third parties when you
              explicitly consent to such sharing.
            </p>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              7.6 No Sale of Personal Information
            </h3>
            <p className="text-gray-300 mb-4">
              Cobalt does not sell, rent, or trade your personal information to
              third parties for monetary consideration.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              8. YOUR PRIVACY RIGHTS
            </h2>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              8.1 Access and Portability
            </h3>
            <p className="text-gray-300 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>
                Request a copy of your data in a structured, commonly used, and
                machine-readable format
              </li>
              <li>
                Export your financial data and transaction history from our
                platform
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              8.2 Correction and Updating
            </h3>
            <p className="text-gray-300 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>Correct inaccurate or incomplete personal information</li>
              <li>
                Update your account details, preferences, and settings at any
                time through your account dashboard
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              8.3 Deletion
            </h3>
            <p className="text-gray-300 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                Request deletion of your account and associated personal
                information
              </li>
              <li>
                Delete specific financial account connections without deleting
                your entire account
              </li>
              <li>
                Remove individual data points or categories of information as
                supported by the platform
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              8.4 Objection and Restriction
            </h3>
            <p className="text-gray-300 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>Object to certain processing of your personal information</li>
              <li>
                Request restriction of processing under certain circumstances
              </li>
              <li>
                Opt out of non-essential communications and marketing messages
              </li>
            </ul>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              8.5 Exercising Your Rights
            </h3>
            <p className="text-gray-300 mb-4">
              To exercise any of these rights, please:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>Access your account settings for self-service options, or</li>
              <li>
                Contact us at feedback@try-cobalt.com with your specific request
              </li>
            </ul>
            <p className="text-gray-300 mb-4">
              We will respond to your request within the timeframe required by
              applicable law, typically within thirty (30) days.
            </p>

            <h3 className="text-xl font-semibold font-manrope mb-3 mt-6">
              8.6 Verification
            </h3>
            <p className="text-gray-300 mb-4">
              For your security, we may require verification of your identity
              before processing certain requests, particularly those involving
              access to or deletion of personal information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              9. INTERNATIONAL DATA TRANSFERS
            </h2>
            <p className="text-gray-300 mb-4">
              Cobalt operates in the United States. If you access our Services
              from outside the United States, please be aware that your
              information may be transferred to, stored, and processed in the
              United States or other countries where our service providers
              operate. These countries may have data protection laws that differ
              from those of your country of residence.
            </p>
            <p className="text-gray-300 mb-4">
              By using our Services, you consent to the transfer of your
              information to the United States and other countries as necessary
              to provide the Services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              10. CHILDREN'S PRIVACY
            </h2>
            <p className="text-gray-300 mb-4">
              Our Services are not intended for individuals under the age of
              eighteen (18). We do not knowingly collect, maintain, or use
              personal information from children under 18. If we become aware
              that we have inadvertently collected personal information from a
              child under 18, we will take steps to delete such information
              promptly.
            </p>
            <p className="text-gray-300 mb-4">
              If you believe we have collected information from a child under
              18, please contact us immediately at feedback@try-cobalt.com.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              11. CHANGES TO THIS PRIVACY POLICY
            </h2>
            <p className="text-gray-300 mb-4">
              We may update this Privacy Policy from time to time to reflect
              changes in our practices, technologies, legal requirements, or
              other factors. When we make changes, we will:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li>
                Update the "Effective Date" at the top of this Privacy Policy
              </li>
              <li>
                Provide notice of material changes through the Services, by
                email, or other appropriate means
              </li>
              <li>Obtain your consent if required by applicable law</li>
            </ul>
            <p className="text-gray-300 mb-4">
              We encourage you to review this Privacy Policy periodically. Your
              continued use of the Services after changes become effective
              constitutes your acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-manrope mb-4">
              12. CONTACT INFORMATION
            </h2>
            <p className="text-gray-300 mb-4">
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or our data practices, please contact us:
            </p>
            <div className="text-gray-300 mb-4">
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
              <p className="ml-4">Privacy Compliance Officer</p>
              <p className="ml-4">35 W 15th St, Apt 17A</p>
              <p className="ml-4">New York, NY 10011</p>
            </div>
            <p className="text-gray-300 mb-4">
              We will make every effort to respond to your inquiry promptly and
              address your concerns.
            </p>
          </section>

          <p className="text-gray-400 text-sm mt-12">
            © 2025 Cobalt Personal Finance Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
