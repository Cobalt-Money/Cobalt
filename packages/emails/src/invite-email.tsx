import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";

import { colors, font, radii } from "./tokens";

export interface InviteEmailProps {
  inviterName: string;
  inviteUrl: string;
}

export function InviteEmail({ inviterName, inviteUrl }: InviteEmailProps) {
  const who = inviterName || "A friend";
  return (
    <Html>
      <Head />
      <Preview>{`${who} invited you to Cobalt Friends`}</Preview>
      <Body
        style={{
          background: colors.background,
          color: colors.textPrimary,
          fontFamily: font,
          margin: 0,
          padding: "32px 16px",
        }}
      >
        <Container
          style={{
            background: colors.surface,
            borderRadius: radii.card,
            maxWidth: "480px",
            padding: "32px",
          }}
        >
          <Heading
            as="h1"
            style={{
              color: colors.textPrimary,
              fontSize: "20px",
              lineHeight: 1.3,
              margin: "0 0 12px",
            }}
          >
            {`${who} invited you to Cobalt Friends`}
          </Heading>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: "14px",
              lineHeight: 1.5,
              margin: "0 0 24px",
            }}
          >
            Tap the button below to accept the invite and connect on the map.
          </Text>
          <Section>
            <Button
              href={inviteUrl}
              style={{
                background: colors.buttonBg,
                borderRadius: radii.button,
                color: colors.buttonText,
                fontSize: "14px",
                fontWeight: 600,
                padding: "12px 20px",
                textDecoration: "none",
              }}
            >
              Accept invite
            </Button>
          </Section>
          <Text
            style={{
              color: colors.textFaint,
              fontSize: "12px",
              lineHeight: 1.5,
              margin: "24px 0 0",
              wordBreak: "break-all",
            }}
          >
            {`Or open: ${inviteUrl}`}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderInviteEmail(
  props: InviteEmailProps,
): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([
    render(<InviteEmail {...props} />),
    render(<InviteEmail {...props} />, { plainText: true }),
  ]);
  return { html, text };
}
