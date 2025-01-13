import { ArbitraryTypedObject, nodesToPortableText, PortableTextSpan, traversePortableText } from "../../../src";
import { browserParse } from "../../../src/parser/browser";
import { nodeParse } from "../../../src/parser/node";
import { toManagementApiFormat } from "../../../src/utils/resolution/mapi";

jest.mock("short-unique-id", () => {
  return jest.fn().mockImplementation(() => {
    return {
      randomUUID: jest.fn().mockReturnValue("guid"),
    };
  });
});

const isSpan = (object: ArbitraryTypedObject): object is PortableTextSpan => object._type === "span";

const sortMarks = (obj: ArbitraryTypedObject) => isSpan(obj) ? { ...obj, marks: obj.marks?.sort() } : obj;

describe("portabletext to MAPI resolver", () => {
  const transformAndCompare = (richTextContent: string) => {
    // Parse the rich text content into a tree
    const browserTree = browserParse(richTextContent);
    const nodeTree = nodeParse(richTextContent);

    // Convert the tree to Portable Text
    const nodePortableText = nodesToPortableText(nodeTree);
    const browserPortableText = nodesToPortableText(browserTree);

    // Convert Portable Text to MAPI format
    const nodeManagementApiFormat = toManagementApiFormat(nodePortableText);
    const browserManagementApiFormat = toManagementApiFormat(browserPortableText);

    // Parse the MAPI format back into a tree and convert it to Portable Text
    const secondParseTree = nodeParse(nodeManagementApiFormat);
    const secondParsePortableText = nodesToPortableText(secondParseTree);

    // Compare the MAPI formats to ensure consistency across platforms
    expect(nodeManagementApiFormat).toEqual(browserManagementApiFormat);

    // Compare the original Portable Text to the re-parsed Portable Text after MAPI conversion
    expect(
      traversePortableText(secondParsePortableText, sortMarks),
    ).toStrictEqual(
      traversePortableText(nodePortableText, sortMarks),
    );
  };

  it("handles nested style marks", () => {
    const richTextContent =
      `<p><strong>Bold text.</strong><em><strong>Bold italic text. </strong></em><em><sup>Superscript italic </sup></em><em><strong><sub>subscript bold</sub></strong></em></p>`;
    transformAndCompare(richTextContent);
  });

  it("handles rich text with internal links", () => {
    const richTextContent =
      `<p>Here is an <a data-item-id="12345"><strong>internal link</strong></a> in some text.</p>`;
    transformAndCompare(richTextContent);
  });

  it("handles rich text with external links", () => {
    const richTextContent =
      `<p>Here is an <a href="https://example.com" target="_blank" data-new-window="true" title="linktitle">external link</a> in some text.</p>`;
    transformAndCompare(richTextContent);
  });

  it("handles images correctly", () => {
    const richTextContent = `<figure data-asset-id="12345"><img src="#" data-asset-id="12345"></figure>`;
    transformAndCompare(richTextContent);
  });

  it("duplicates a link under specific style conditions", () => {
    /**
     * tl;dr
     *
     * under very specific rich text inputs, neither MAPI rich text restored from portableText,
     * nor the portable text output transformed from the restored MAPI match their original
     * counterparts, despite both resulting in visually identical, MAPI-valid HTML representations.
     * this makes equality testing rather problematic.
     *
     * more info
     *
     * toHTML method automatically merges adjacent style tag pairs of the same type.
     * such duplicates are a common occurrence in rich text content created via the in-app editor,
     * as is the case with the below richTextContent.
     *
     * in the below scenario, toHTML keeps only the first and last strong tags. to avoid nesting violation, it ends the anchor link right before
     * the closing </strong>. this would remove the link from the remaining unstyled text, so to maintain functionality,
     * it is wrapped into an identical, duplicate anchor link.
     *
     * while richTextContent and mapiFormat visual outputs are the same, the underlying portable text and html semantics are not, as seen
     * in mapiFormat snapshot.
     */
    const richTextContent =
      `<p><strong>strong text </strong><a href="https://example.com"><strong>example strong link text</strong>not strong link text</a></p>`;
    const tree = nodeParse(richTextContent);
    const portableText = nodesToPortableText(tree);
    const mapiFormat = toManagementApiFormat(portableText);

    const secondParseTree = nodeParse(mapiFormat);
    const secondParsePortableText = nodesToPortableText(secondParseTree);
    const secondParseMapiFormat = toManagementApiFormat(secondParsePortableText);

    expect(portableText).toMatchInlineSnapshot(`
[
  {
    "_key": "guid",
    "_type": "block",
    "children": [
      {
        "_key": "guid",
        "_type": "span",
        "marks": [
          "strong",
        ],
        "text": "strong text ",
      },
      {
        "_key": "guid",
        "_type": "span",
        "marks": [
          "strong",
          "guid",
        ],
        "text": "example strong link text",
      },
      {
        "_key": "guid",
        "_type": "span",
        "marks": [
          "guid",
        ],
        "text": "not strong link text",
      },
    ],
    "markDefs": [
      {
        "_key": "guid",
        "_type": "link",
        "href": "https://example.com",
      },
    ],
    "style": "normal",
  },
]
`);

    expect(mapiFormat).toMatchInlineSnapshot(
      `"<p><strong>strong text <a href="https://example.com">example strong link text</a></strong><a href="https://example.com">not strong link text</a></p>"`,
    );

    expect(richTextContent).not.toEqual(secondParseMapiFormat);
    expect(portableText).not.toEqual(secondParsePortableText);

    // duplicate markdefinition
    expect(secondParsePortableText[0].markDefs[0]).toEqual(secondParsePortableText[0].markDefs[1]);
  });
});
