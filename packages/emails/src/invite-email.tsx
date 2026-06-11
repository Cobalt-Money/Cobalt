/**
 * Friend invite email. Markup adapted from the Resend "Protocol" demo
 * (https://github.com/resend/react-email/tree/canary/apps/demo/emails/03-Protocol),
 * trimmed to a single CTA + footer for the invite use case.
 */
import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  render,
  Section,
  Tailwind,
  Text,
} from "react-email";

import { EmailFonts } from "./email-fonts";
import { emailTailwindConfig } from "./theme";

export interface InviteEmailProps {
  inviterName: string;
  inviteUrl: string;
}

export const InviteEmail = ({ inviterName, inviteUrl }: InviteEmailProps) => {
  const who = inviterName || "A friend";
  return (
    <Tailwind config={emailTailwindConfig}>
      <Html>
        <Head>
          <EmailFonts />
        </Head>
        <Body className="bg-bg-2 font-14 m-0 p-0 font-sans">
          <Preview>{`${who} invited you to Cobalt Friends`}</Preview>
          <Container className="bg-bg mx-auto max-w-[640px]">
            <Section className="mobile:px-4 px-6 py-6">
              <Text className="font-20 font-condensed text-fg m-0 uppercase">Cobalt</Text>
            </Section>

            <Section className="mobile:px-4 mobile:pt-10 mobile:pb-8 px-6 pt-16 pb-12">
              <Section align="left" className="mobile:!max-w-full max-w-[490px]">
                <Text className="mobile:!max-w-full font-56 font-condensed mobile:font-40 text-fg m-0 max-w-[490px] uppercase">
                  {`${who} invited you to Cobalt Friends`}
                </Text>
                <Text className="mobile:!max-w-full font-14 text-fg-2 m-0 mt-10 max-w-[490px] font-sans">
                  Accept the invite to connect on the map, share spend highlights, and split things
                  effortlessly.
                </Text>
              </Section>
            </Section>

            <Section className="mobile:px-4 mobile:pb-10 px-6 pb-14">
              <Link
                className="bg-fg font-15 inline-block rounded-md px-6 py-3 font-sans no-underline"
                href={inviteUrl}
                style={{ color: "#131313" }}
              >
                Accept invite
              </Link>
              <Text
                className="font-11 text-fg-3 m-0 mt-6 max-w-[490px] font-sans"
                style={{ wordBreak: "break-all" }}
              >
                {`Or open this link: ${inviteUrl}`}
              </Text>
            </Section>

            <Section className="mobile:px-4 mobile:py-12 border-stroke border-t px-6 py-16">
              <Text className="font-13 text-fg-2 m-0 max-w-[420px] font-sans">
                Cobalt is the personal finance OS for the people you trust. If you weren&apos;t
                expecting this invite, you can safely ignore this email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};

InviteEmail.PreviewProps = {
  inviteUrl: "https://friends.cobaltpf.com/invite/preview-token",
  inviterName: "Sriket",
} satisfies InviteEmailProps;

export default InviteEmail;

export async function renderInviteEmail(
  props: InviteEmailProps,
): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([
    render(<InviteEmail {...props} />),
    render(<InviteEmail {...props} />, { plainText: true }),
  ]);
  return { html, text };
}
