# JSON Transformers

This module provides an environment-aware `parseHtml` function to convert an HTML string into an array of nodes. The JSON structure can subsequently be transformed using one of the provided transformation methods, either to a modified HTML string or a completely different structure, both in synchronous and asynchronous manner.

This toolset can be particularly useful for transforming rich text or HTML content from external sources into a valid Kontent.ai rich text format in migration scenarios. 

## Usage

Pass stringified HTML to `parseHtml` function to get an array of `DomNode` objects:

```ts
import { parseHtml } from '@kontent-ai/rich-text-resolver';

const rawHtml = `<p>Hello <strong>World!</strong></p>`;

const parsedNodes = parseHtml(rawHtml);
```

`DomNode` is a union of `DomHtmlNode` and `DomTextNode`, defined as follows:

```ts
export type DomNode = DomHtmlNode | DomTextNode;

export interface DomTextNode {
  type: "text";
  content: string;
}

export interface DomHtmlNode<TAttributes = Record<string, string | undefined>> {
  type: "tag";
  tagName: string;
  attributes: TAttributes & Record<string, string | undefined>;
  children: DomNode[];
}
```

The resulting array can be transformed using one of the functions included in the module.

### HTML Transformation

To transform the `DomNode` array back to HTML, you can use `nodesToHtml` function or its async variant `nodesToHtmlAsync`. The function accepts the parsed array and a `transformers` object, which defines custom transformation for each HTML node. Text nodes are transformed automatically. A wildcard `*` can be used to define fallback transformation for all tags not explicitly defined. If no explicit or wildcard transformation is provided, default resolution is used.

#### Basic
Basic example of HTML transformation, removing HTML attribute `style` and transforming `b` tag to `strong`:
```ts
import { nodesToHtml } from 'your-json-transformer';

const rawHtml = `<p style="color:red">Hello <b>World!</b></p>`;
const parsedNodes = parseHtml(rawHtml);

const transformers: NodeToStringMap = {
  // children contains already transformed child nodes
  b: (node, children) => `<strong>${children}</strong>`;
  "*": (node, children) => `<${node.tagName}>${children}</${node.tagName}>`;
};

// restores original HTML with attributes
let htmlOutput = nodesToHtml(parsedNodes, {});
console.log(htmlOutput); // <p style="color:red">Hello <b>World!</b></p>

// b is converted to strong, wildcard transformation omits attributes from remaining nodes
htmlOutput = nodesToHtml(parsedNodes, transformers);
console.log(htmlOutput); // <p>Hello <strong>World!</strong></p>
```

#### Advanced
For more complex scenarios, optional context and its handler can be passed to the transformation function as third and fourth parameters respectively. Context can be accessed when defining node transformations. If a handler is provided, it clones the context before it's modified and passed to child node processing, thus maintaining correct context state for each node.

Example showcasing asynchronous transformation of `<img>` tag to `<figure>`, simultaneously uploading the image to Kontent.ai asset library, using SDK `ManagementClient` provided as context:

```ts
import axios from "axios";
import { ManagementClient } from "@kontent-ai/management-sdk";
import {
  parseHtml,
  AsyncNodeToStringMap,
  nodesToHtmlAsync,
} from "@kontent-ai/rich-text-resolver";

const input = `<p><img src="https://website.com/image.jpg" alt="some image"></p>`;
const nodes = parseHtml(input);
const transformers: AsyncNodeToStringMap<ManagementClient> = {
  img: async (node, _, client) => {
    return await new Promise<string>((resolve, reject) => {
      if (!client) {
        reject("Client is not provided");
        return;
      }

      const src: string = node.attributes.src;

      axios.get(src, { responseType: "arraybuffer" }).then(async (response) => {
        const base64 = Buffer.from(response.data, "binary").toString("base64");
        const filename = src.split("/").pop()!;
        const uploadResponse = await client
          .uploadBinaryFile()
          .withData({
            binaryData: base64,
            contentLength: base64.length,
            contentType:
              response.headers["content-type"] || "application/octet-stream",
            filename,
          })
          .toPromise()
          .then((res) => res.data);

        const fileReference = {
          id: uploadResponse.id,
          type: "internal" as const,
        };

        const image = await client
          .addAsset()
          .withData(() => ({
            file_reference: fileReference,
            title: filename,
            descriptions: [
              {
                language: { codename: "default" },
                description: node.attributes.alt ?? "Auto-generated asset",
              },
            ],
          }))
          .toPromise()
          .then((res) => res.data);

        resolve(`<figure data-asset-id="${image.id}"></figure>`);
      });
    });
  },
};

const richText = nodesToHtmlAsync(
  nodes,
  transformers,
  new ManagementClient({
    environmentId: "YOUR_ENVIRONMENT_ID",
    apiKey: "YOUR_MANAGEMENT_API_KEY",
  })
);

console.log(richText); 
// <p><figure data-asset-id="cc8f13a2-e0fb-468b-ba18-344c6e2ecb66"></figure></p>
```

### Generic transformation

Should you need to transform the nodes to a different structure, rather than HTML (string), you can use `transformNodes` (`transformNodesAsync`) function. Its usage is similar but revolves around generics and provides further control over the output, such as specifying custom transformation for text nodes.

Snippet showcasing use of `transformNodes` to convert the `DomNode` array into Portable Text, as used internally in this module. Full source code in [the corresponding TS file](../src/transformers/portable-text-transformer/portable-text-transformer.ts).

```ts
type ListContext = {
  depth: number;
  type: "number" | "bullet" | "unknown";
};

const transformers: NodeTransformers<PortableTextItem, ListContext> = {
  text: processText,
  tag: {
    ...(Object.fromEntries(
      blockElements.map((tagName) => [tagName, processBlock]),
    ) as Record<BlockElement, NodeToPortableText<DomHtmlNode>>),
    ...(Object.fromEntries(
      textStyleElements.map((tagName) => [tagName, processMark]),
    ) as Record<TextStyleElement, NodeToPortableText<DomHtmlNode>>),
    ...(Object.fromEntries(
      ignoredElements.map((tagName) => [tagName, ignoreProcessing]),
    ) as Record<IgnoredElement, NodeToPortableText<DomHtmlNode>>),
    a: processMark,
    li: processListItem,
    table: processTable,
    tr: processTableRow,
    td: processTableCell,
    br: processLineBreak,
    img: processImage,
    object: processLinkedItemOrComponent,
  },
};

const updateListContext = (node: DomNode, context: ListContext): ListContext =>
  (isElement(node) && isListBlock(node))
    ? { depth: context.depth + 1, type: node.tagName === "ol" ? "number" : "bullet" }
    : context;

export const nodesToPortableText = (
  parsedNodes: DomNode[],
): PortableTextObject[] =>
  transformNodes(
    parsedNodes,
    transformers,
    { depth: 0, type: "unknown" }, // initialization of list transformation context
    updateListContext,
  ) as PortableTextObject[];
```


