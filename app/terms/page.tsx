export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="mt-12 prose prose-lg mx-auto">
          <h2>Acceptance of Terms</h2>
          <p>
            By accessing and using SocialPulse (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2>Description of Service</h2>
          <p>
            SocialPulse is a web application that allows users to schedule and manage posts across multiple social media platforms. Our service enables you to:
          </p>
          <ul>
            <li>Connect your social media accounts</li>
            <li>Schedule posts for future publication</li>
            <li>Manage content across multiple platforms</li>
            <li>View analytics and insights</li>
          </ul>

          <h2>User Accounts</h2>
          <p>
            To access certain features of the Service, you must register for an account. You agree to:
          </p>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized use</li>
          </ul>

          <h2>Social Media Integration</h2>
          <p>
            When you connect your social media accounts to our Service:
          </p>
          <ul>
            <li>You grant us permission to post content on your behalf</li>
            <li>You remain responsible for all content posted through our Service</li>
            <li>You must comply with each platform&apos;s terms of service</li>
            <li>You can revoke access at any time through your account settings</li>
          </ul>

          <h2>Acceptable Use</h2>
          <p>
            You agree not to use the Service to:
          </p>
          <ul>
            <li>Post illegal, harmful, or offensive content</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Spam or harass other users</li>
            <li>Attempt to gain unauthorized access to our systems</li>
          </ul>

          <h2>Content and Intellectual Property</h2>
          <p>
            You retain ownership of all content you post through our Service. By using our Service, you grant us a limited license to process and display your content as necessary to provide the Service.
          </p>

          <h2>Privacy</h2>
          <p>
            Your privacy is important to us. Please refer to our Privacy Policy for information about how we collect, use, and protect your data.
          </p>

          <h2>Service Availability</h2>
          <p>
            We strive to maintain high availability of our Service, but we do not guarantee uninterrupted access. We may perform maintenance, updates, or modifications that temporarily affect service availability.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            SocialPulse is provided &quot;as is&quot; without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
          </p>

          <h2>Termination</h2>
          <p>
            We may terminate or suspend your account at any time for violations of these terms. You may also terminate your account at any time through your account settings.
          </p>

          <h2>Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify you of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new terms.
          </p>

          <h2>Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
          </p>

          <h2>Contact Information</h2>
          <p>
            If you have questions about these Terms of Service, please contact us at support@socialscheduler.com
          </p>
        </div>
      </div>
    </div>
  )
}