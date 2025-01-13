# JSON Transformers

This module provides an environment-aware (browser or Node.js) `parseHtml` function to convert an HTML string into an array of nodes. The JSON structure can subsequently be transformed using one of the provided transformation methods, either to a modified HTML string or a completely different structure, both in synchronous and asynchronous manner.

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

To transform the `DomNode` array back to HTML, you can use `nodesToHtml` function or its async variant `nodesToHtmlAsync`. The function accepts the parsed array and a `transformers` object, which defines custom transformation for each HTML node. Text nodes are transformed automatically. A wildcard `*` can be used to define fallback transformation for remaining tags. If no explicit or wildcard transformation is provided, default resolution is used.

#### Basic
Basic example of HTML transformation, removing HTML attribute `style` and transforming `b` tag to `strong`:
```ts
import { nodesToHtml, NodeToStringMap, parseHtml } from '@kontent-ai/rich-text-resolver';

const rawHtml = `<p style="color:red">Hello <b>World!</b></p>`;
const parsedNodes = parseHtml(rawHtml);

const transformers: NodeToStringMap = {
  // children contains already transformed child nodes
  b: (node, children) => `<strong>${children}</strong>`;
  "*": (node, children) => `<${node.tagName}>${children}</${node.tagName}>`;
};

// restores original HTML with attributes
const defaultOutput = nodesToHtml(parsedNodes, {});
console.log(defaultOutput); // <p style="color:red">Hello <b>World!</b></p>

// b is converted to strong, wildcard transformation omits attributes from remaining nodes
const customOutput = nodesToHtml(parsedNodes, transformers);
console.log(customOutput); // <p>Hello <strong>World!</strong></p>
```

#### Advanced

For more complex scenarios, optional context and its handler can be passed to the top level transformation function (`nodesToHtml` or its async variant) as third and fourth parameters respectively.

The context can then be accessed in individual transformations, defined in the `transformers` object. If you need to dynamically update the context, you may optionally provide a context handler, which accepts current node and context as parameters and passes a cloned, modified context for child node processing, ensuring each node gets valid contextual data.

##### Transforming img tag and creating an asset in the process (no handler)

In Kontent.ai rich text, images are represented by a `<figure>` tag, with `data-asset-id` attribute referencing an existing asset in the asset library. Transforming an `img` tag is therefore a two-step process:

1. Load the binaries from `src` attribute and create an asset in Kontent.ai asset library
2. Use the asset ID from previous step to reference the asset in the transformed `<figure>` tag.

For that matter, we will use `nodesToHtmlAsync` method and pass an instance of JS SDK `ManagementClient` as context, to perform the asset creation. Since we don't need to modify the client in any way, we can omit the context handler for this example.

```ts
import { ManagementClient } from "@kontent-ai/management-sdk";
import {
  parseHtml,
  AsyncNodeToStringMap,
  nodesToHtmlAsync,
} from "@kontent-ai/rich-text-resolver";

const input = `<img src="https://website.com/image.jpg" alt="some image">`;
const nodes = parseHtml(input);

// type parameter specifies context type, in this case ManagementClient
const transformers: AsyncNodeToStringMap<ManagementClient> = {
  // context (client) can be accessed as a third parameter in each transformation
  img: async (node, _, client) =>
    await new Promise<string>(async (resolve, reject) => {
      if (!client) {
        reject("Client is not provided");
        return;
      }

      const src: string = node.attributes.src;
      const fileName = src.split("/").pop() || "untitled_file";

      // SDK provides a helper method for creating an asset from URL
      const assetId = await client
        .uploadAssetFromUrl()
        .withData({
          binaryFile: {
            filename: fileName,
          },
          fileUrl: src,
          asset: {
            title: fileName,
            descriptions: [
              {
                language: { codename: "default" },
                description: node.attributes.alt,
              },
            ],
          },
        })
        .toPromise()
        .then((res) => res.data.id) // get asset ID from the response
        .catch((err) => reject(err));

      // return transformed tag, referencing the newly created asset
      resolve(`<figure data-asset-id="${assetId}"></figure>`);
    }),
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
// <figure data-asset-id="cc8f13a2-e0fb-468b-ba18-344c6e2ecb66"></figure>
```

##### Removing nested divs and spans (with context handler)

Assume we have a scenario where we want to transform external HTML to Kontent.ai rich text. The HTML may contain divs and spans, which are not valid rich text tags. Furthermore, these tags can be nested on multiple levels, so a simple transformation `div/span → p` may not suffice, as it could result in nested `p` tags, which is not a valid HTML.

In this case, we can store depth as a context and increment it via handler anytime we access a nested div/span. We will then define transformers for top level divs and spans to be converted to `p`. Remaining nested invalid tags will be removed.

> [!WARNING]  
> The below example is primarily intended as a showcase of context handling during transformation. Unwrapping divs and spans in this manner may still result in an invalid HTML. While a more complex transformation logic can be defined to fit your requirements, we ideally advise you to split the original HTML into multiple elements and for rich text processing, isolate the content originally created in a rich text editor, as it may prove easier to transform in this manner.

```ts
import {
  nodesToHtml,
  DomNode,
  NodeToStringMap,
  parseHtml,
} from "@kontent-ai/rich-text-resolver";

type DepthContext = {
  divSpanDepth: number;
};

const input = `
    <div>Top level
      <span> some text <div>nested <span>deep</span></div></span>
    </div> 
    <div>Another top-level div <span>with text</span></div>
    `;

const parsedNodes = parseHtml(input);

// handler increments depth whenever we encounter a div or span tag node.
const depthHandler = (node: DomNode, context: DepthContext): DepthContext =>
  node.type === "tag" && (node.tagName === "div" || node.tagName === "span")
    ? { ...context, divSpanDepth: context.divSpanDepth + 1 } // return new context with incremented depth
    : context; // return the same context if not div/span

const transformers: NodeToStringMap<DepthContext> = {
  // we'll only define transformations for 'div' and 'span'. Default resolution will transform remaining tags.
  div: (_, children, context) =>
    // topmost div is at depth=1, as context is updated before processing.
    context?.divSpanDepth === 1 ? `<p>${children}</p>` : children,
    
  // same for span
  span: (_, children, context) =>
    context?.divSpanDepth === 1 ? `<p>${children}</p>` : children,
};

const output = nodesToHtml(
  parsedNodes,
  transformers,
  { divSpanDepth: 0 }, // initial context
  depthHandler
);

console.log(output);
// <p>Top level some text nested deep</p><p>Another top-level div with text</p>

```

### Generic transformation

Should you need to transform the nodes to a different structure, rather than HTML (string), you can use `transformNodes` (`transformNodesAsync`) function. Its usage is similar but revolves around generics and provides further control over the output, such as specifying custom transformation for text nodes.

Snippet showcasing use of `transformNodes` to convert the `DomNode` array into Portable Text, as used internally in this module. Full source code in [the corresponding TS file](../src/transformers/portable-text-transformer/portable-text-transformer.ts).

```ts
// context stores current list type and list item depth
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


