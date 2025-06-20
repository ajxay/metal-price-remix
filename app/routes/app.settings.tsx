import { Page, Card, Layout, Text } from "@shopify/polaris";

export default function SettingsPage() {
  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="p">
              This is the settings page. Configure your app settings here.
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
