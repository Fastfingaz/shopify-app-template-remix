import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link as RemixLink } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  IndexTable,
  Thumbnail,
  Badge,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { ImageIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
    query getProducts {
      products(first: 20, reverse: true) {
        edges {
          node {
            id
            title
            status
            featuredImage {
              url
            }
          }
        }
      }
    }`,
  );

  const responseJson = await response.json();

  return json({
    products: responseJson.data!.products!.edges,
  });
};

export default function Index() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="SEO Optimizer Dashboard" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Your Products
                </Text>

                {products.length === 0 ? (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No products found. Add some products to Shopify to get started.
                  </Text>
                ) : (
                  <IndexTable
                    resourceName={{ singular: "product", plural: "products" }}
                    itemCount={products.length}
                    headings={[
                      { title: "Image" },
                      { title: "Title" },
                      { title: "Status" },
                      { title: "Action" },
                    ]}
                    selectable={false}
                  >
                    {products.map(({ node }: any) => {
                      const productId = node.id.split("/").pop();
                      return (
                        <IndexTable.Row id={node.id} key={node.id} position={node.id}>
                          <IndexTable.Cell>
                            <Thumbnail
                              source={node.featuredImage?.url || ImageIcon}
                              alt={node.title}
                              size="small"
                            />
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <Text as="span" fontWeight="bold">{node.title}</Text>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <Badge tone={node.status === "ACTIVE" ? "success" : "info"}>{node.status}</Badge>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <Button url={`/app/optimize/${productId}`} variant="primary" tone="critical">
                              Optimize SEO
                            </Button>
                          </IndexTable.Cell>
                        </IndexTable.Row>
                      );
                    })}
                  </IndexTable>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Current Plan</Text>
                <Text as="p">You are on the <b>Starter</b> plan.</Text>
                <Button>Upgrade Plan</Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

