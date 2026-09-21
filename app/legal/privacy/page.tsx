import type { Metadata } from "next";

import {
  ContactLine,
  LegalPage,
  List,
  Section,
  Subheading,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Kitch",
  description: "How Kitch collects, uses, and protects personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This page explains how Kitch collects, uses, and protects personal information."
    >
      <Section number={1} title="Overview">
        <p>
          This Privacy Policy describes how Kitch (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, and discloses
          information when you use the Kitch mobile application (the
          &ldquo;App&rdquo;).
        </p>
        <p>
          Kitch is designed to collect only the data necessary to provide core
          functionality. We do not sell personal data or use it for advertising
          or marketing.
        </p>
      </Section>

      <Section number={2} title="Information We Collect">
        <Subheading>a. Account Information</Subheading>
        <p>
          When you create an account or sign in using Apple or Google, we
          collect:
        </p>
        <List
          items={[
            "Name",
            "Email address",
            "Authentication credentials (handled securely via our authentication provider)",
            "Profile photo (if provided)",
          ]}
        />

        <Subheading>b. User-Generated Content</Subheading>
        <p>You may create and upload:</p>
        <List items={["Recipes", "Images", "Profile content"]} />
        <p>This content is stored and associated with your account.</p>

        <Subheading>c. Technical Information</Subheading>
        <p>
          We may collect limited technical data required for operation, such as:
        </p>
        <List
          items={[
            "Device type",
            "App usage data (for debugging and performance)",
          ]}
        />
        <p>We do not track users across apps or websites.</p>
      </Section>

      <Section number={3} title="How We Use Information">
        <p>We use collected data strictly to:</p>
        <List
          items={[
            "Create and manage user accounts",
            "Authenticate users",
            "Store, process, and display user content",
            "Provide recipe parsing functionality",
            "Maintain app performance and security",
          ]}
        />
        <p>We do not use your data for:</p>
        <List
          items={["Advertising", "Marketing communications", "Cross-app tracking"]}
        />
      </Section>

      <Section number={4} title="Third-Party Services">
        <p>We rely on the following service providers to operate the App:</p>
        <List
          items={[
            "Supabase (authentication, database, storage)",
            "OpenAI (processing and structuring recipe content)",
            "Bright Data (retrieving recipe text from external sources)",
          ]}
        />
        <p>
          These providers may process data solely on our behalf to deliver App
          functionality.
        </p>
      </Section>

      <Section number={5} title="Data Retention">
        <p>
          We retain your personal data only while your account is active. When
          you delete your account using the in-app deletion feature:
        </p>
        <List
          items={[
            "Your personal data and user-generated content are deleted within a reasonable timeframe, except where retention is required by law.",
          ]}
        />
      </Section>

      <Section number={6} title="Account Deletion">
        <p>Kitch provides an in-app account deletion mechanism.</p>
        <List
          items={[
            "Your profile information is removed",
            "Your uploaded content is deleted",
            "Access to your account is permanently revoked",
          ]}
        />
      </Section>

      <Section number={7} title="Your Rights">
        <p>You can:</p>
        <List
          items={[
            "Access and update your information within the App",
            "Delete your account and associated data at any time",
          ]}
        />
      </Section>

      <Section number={8} title="Data Security">
        <p>
          We use reasonable administrative, technical, and physical safeguards to
          protect your information. However, no system can be guaranteed to be
          100% secure.
        </p>
      </Section>

      <Section number={9} title="Children&rsquo;s Privacy">
        <p>
          Kitch is not directed to children under 13, and we do not knowingly
          collect personal data from children under 13.
        </p>
      </Section>

      <Section number={10} title="International Data Transfers">
        <p>
          Kitch is operated from Canada but uses service providers that may
          process data in other countries. By using the App, you consent to such
          transfers.
        </p>
      </Section>

      <Section number={11} title="Changes to This Policy">
        <p>
          We may update this Privacy Policy periodically. Continued use of the
          App after changes indicates acceptance of the updated policy.
        </p>
      </Section>

      <Section number={12} title="Contact">
        <ContactLine lead="If you have questions or requests regarding this Privacy Policy, contact:" />
      </Section>
    </LegalPage>
  );
}
