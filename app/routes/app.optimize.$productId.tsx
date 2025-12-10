
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, useSubmit, Form } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    TextField,
    Button,
    Banner,
    InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { generateProductMetadata } from "../services/ai.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const { admin } = await authenticate.admin(request);
    const response = await admin.graphql(
        `#graphql
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        title
        descriptionHtml
      }
    }`,
        {
            variables: {
                id: `gid://shopify/Product/${params.productId}`,
            },
        },
    );

    const responseJson = await response.json();
    const product = responseJson.data!.product!;

    return json({ product });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "optimize") {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const result = await generateProductMetadata(title, description);
        return json({ result });
    }

    if (actionType === "save") {
        const title = formData.get("title") as string;
        const description = formData.get("descriptionHtml") as string;

        // Save to Shopify
        await admin.graphql(
            `#graphql
      mutation updateProduct($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            descriptionHtml
          }
          userErrors {
            field
            message
          }
        }
      }`,
            {
                variables: {
                    input: {
                        id: `gid://shopify/Product/${params.productId}`,
                        title,
                        descriptionHtml: description,
                    },
                },
            },
        );

        return json({ success: true });
    }

    return json({ error: "Invalid action" });
};

export default function OptimizeProduct() {
    const { product } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();

    const generated = fetcher.data?.result;
    const isSaving = fetcher.state === "submitting" && fetcher.formData?.get("actionType") === "save";
    const isOptimizing = fetcher.state === "submitting" && fetcher.formData?.get("actionType") === "optimize";

    return (
        <Page
            backAction={{ content: "Products", url: "/app" }}
            title={`Optimize: ${product.title}`}
        >
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">Original Content</Text>
                            <Text as="p" fontWeight="bold">Title: {product.title}</Text>
                            <div dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />

                            <fetcher.Form method="post">
                                <input type="hidden" name="actionType" value="optimize" />
                                <input type="hidden" name="title" value={product.title} />
                                <input type="hidden" name="description" value={product.descriptionHtml.replace(/<[^>]*>?/gm, "")} /> {/* Plain text for AI */}
                                <Button submit loading={isOptimizing} variant="primary">Generate AI Optimization</Button>
                            </fetcher.Form>
                        </BlockStack>
                    </Card>

                    {generated && (
                        <Card>
                            <fetcher.Form method="post">
                                <BlockStack gap="400">
                                    <Banner title="AI Suggestions Ready" tone="success" />
                                    <TextField
                                        label="Optimized Title"
                                        name="title"
                                        autoComplete="off"
                                        defaultValue={generated.title}
                                    />
                                    <TextField
                                        label="Optimized Description (HTML)"
                                        name="descriptionHtml"
                                        autoComplete="off"
                                        multiline={4}
                                        defaultValue={generated.description}
                                    />

                                    <InlineStack gap="300">
                                        <Button submit name="actionType" value="save" loading={isSaving} variant="primary">Apply to Shopify</Button>
                                    </InlineStack>
                                </BlockStack>
                            </fetcher.Form>
                        </Card>
                    )}
                </Layout.Section>
            </Layout>
        </Page>
    );
}
