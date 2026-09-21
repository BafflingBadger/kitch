import type { Metadata } from "next";

import {
  ContactLine,
  LegalPage,
  List,
  Section,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | Kitch",
  description: "The terms that govern your access to and use of Kitch.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="This page explains the terms that govern your access to and use of Kitch."
    >
      <Section number={1} title="Acceptance of Terms">
        <p>
          By creating an account or using Kitch, you agree to these Terms of
          Service.
        </p>
      </Section>

      <Section number={2} title="Eligibility">
        <p>You must be at least 13 years old to use the App.</p>
      </Section>

      <Section number={3} title="User Accounts">
        <p>You are responsible for:</p>
        <List
          items={[
            "Maintaining the confidentiality of your account",
            "All activities conducted under your account",
          ]}
        />
        <p>
          We reserve the right to suspend or terminate accounts for violations of
          these Terms.
        </p>
      </Section>

      <Section number={4} title="User Content">
        <p>
          You retain ownership of the content you upload, including recipes and
          images.
        </p>
        <p>
          By submitting content, you grant Kitch a worldwide, non-exclusive,
          royalty-free license to:
        </p>
        <List
          items={["Host", "Store", "Reproduce", "Display", "Distribute"]}
        />
        <p>
          Your content will be used solely for the purpose of operating and
          improving the App.
        </p>
      </Section>

      <Section number={5} title="Acceptable Use">
        <p>You agree not to:</p>
        <List
          items={[
            "Post illegal, harmful, or abusive content",
            "Infringe intellectual property rights",
            "Upload malicious code or spam",
          ]}
        />
        <p>
          We may remove content or restrict accounts that violate these rules.
        </p>
      </Section>

      <Section number={6} title="Content Moderation">
        <p>Kitch reserves the right to:</p>
        <List
          items={[
            "Remove content at its discretion",
            "Suspend or terminate users who violate these Terms",
          ]}
        />
      </Section>

      <Section number={7} title="Subscriptions and Payments">
        <p>Kitch offers optional premium subscriptions:</p>
        <List
          items={[
            "Payments are processed through Apple's in-app purchase system",
            "Subscriptions automatically renew unless canceled through your Apple account",
            "Refunds are handled by Apple in accordance with their policies",
          ]}
        />
      </Section>

      <Section number={8} title="Third-Party Services">
        <p>
          The App depends on third-party services (including Supabase, OpenAI,
          and Bright Data). We are not responsible for the availability or
          performance of these services.
        </p>
      </Section>

      <Section number={9} title="Termination">
        <p>
          You may delete your account at any time using the in-app feature. We
          may suspend or terminate your access if:
        </p>
        <List
          items={[
            "You violate these Terms",
            "Required by law",
            "Necessary to protect the App or its users",
          ]}
        />
      </Section>

      <Section number={10} title="Disclaimer of Warranties">
        <p>
          The App is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
          without warranties of any kind.
        </p>
      </Section>

      <Section number={11} title="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Kitch is not liable for:
        </p>
        <List
          items={[
            "Indirect or consequential damages",
            "Loss of data or content",
            "Service interruptions",
          ]}
        />
      </Section>

      <Section number={12} title="Governing Law">
        <p>
          These Terms are governed by the laws of British Columbia, Canada.
        </p>
      </Section>

      <Section number={13} title="Changes to Terms">
        <p>
          We may update these Terms from time to time. Continued use of the App
          constitutes acceptance of the updated Terms.
        </p>
      </Section>

      <Section number={14} title="Contact">
        <ContactLine lead="For questions regarding these Terms:" />
      </Section>
    </LegalPage>
  );
}
