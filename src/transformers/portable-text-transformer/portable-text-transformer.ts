import { match } from "ts-pattern";

import {
  DomHtmlNode,
  DomNode,
  DomTextNode,
  ImgElementAttributes,
  ObjectElementAttributes,
  parseHtml,
} from "../../parser/index.js";
import {
  BlockElement,
  IgnoredElement,
  NodeTransformer,
  NodeTransformers,
  PortableTextComponentOrItem,
  PortableTextExternalLink,
  PortableTextImage,
  PortableTextItem,
  PortableTextItemLink,
  PortableTextMark,
  PortableTextObject,
  PortableTextSpan,
  PortableTextStrictBlock,
  PortableTextStrictListItemBlock,
  PortableTextTable,
  PortableTextTableCell,
  PortableTextTableRow,
  Reference,
  TextStyleElement,
  transformNodes,
} from "../../transformers/index.js";
import {
  blockElements,
  createBlock,
  createComponentOrItemBlock,
  createExternalLink,
  createImageBlock,
  createItemLink,
  createListBlock,
  createSpan,
  createTable,
  createTableCell,
  createTableRow,
  ignoredElements,
  isElement,
  isExternalLink,
  isItemLink,
  isListBlock,
  randomUUID,
  textStyleElements,
  throwError,
} from "../../utils/index.js";

type ListContext = {
  depth: number;
  type: "number" | "bullet" | "unknown";
};

type ReferenceData = {
  reference: string;
  refType: "id" | "external-id" | "codename";
};

type NodeToPortableText<T extends DomNode> = NodeTransformer<T, ListContext, PortableTextItem>;

const categorizeItems = (items: PortableTextItem[]) =>
  items.reduce(
    (acc, item) => {
      const categoryMap: Record<PortableTextItem["_type"], PortableTextItem[]> = {
        link: acc.links,
        contentItemLink: acc.contentItemLinks,
        span: acc.spans,
        mark: acc.marks,
        cell: acc.cells,
        row: acc.rows,
        image: acc.images,
        componentOrItem: acc.componentsOrItems,
        table: acc.tables,
        block: acc.blocks,
        reference: acc.references,
      };

      if (item._type === "block") {
        (item.listItem ? acc.listBlocks : acc.blocks).push(item);
      } else {
        categoryMap[item._type].push(item);
      }

      return acc;
    },
    {
      links: [] as PortableTextExternalLink[],
      contentItemLinks: [] as PortableTextItemLink[],
      spans: [] as PortableTextSpan[],
      listBlocks: [] as PortableTextStrictListItemBlock[],
      blocks: [] as PortableTextStrictBlock[],
      marks: [] as PortableTextMark[],
      cells: [] as PortableTextTableCell[],
      rows: [] as PortableTextTableRow[],
      images: [] as PortableTextImage[],
      componentsOrItems: [] as PortableTextComponentOrItem[],
      tables: [] as PortableTextTable[],
      references: [] as Reference[],
    },
  );

const getReferenceData = (attributes: Record<string, string | undefined>): ReferenceData | undefined => {
  const refAttributeTypes = [
    { attr: "data-asset-id", refType: "id" },
    { attr: "data-asset-external-id", refType: "external-id" },
    { attr: "data-asset-codename", refType: "codename" },
    { attr: "data-id", refType: "id" },
    { attr: "data-external-id", refType: "external-id" },
    { attr: "data-codename", refType: "codename" },
  ] as const;

  const refInfo = refAttributeTypes.find(({ attr }) => attributes[attr]);

  return refInfo
    ? { reference: attributes[refInfo.attr]!, refType: refInfo.refType }
    : undefined;
};

const updateListContext = (node: DomNode, context: ListContext): ListContext =>
  (isElement(node) && isListBlock(node))
    ? { depth: context.depth + 1, type: node.tagName === "ol" ? "number" : "bullet" }
    : context;

const processLineBreak: NodeToPortableText<DomHtmlNode> = () => [createSpan(randomUUID(), [], "\n")];

const processListItem: NodeToPortableText<DomHtmlNode> = (_, children, listContext) => {
  const {
    links,
    contentItemLinks,
    spans,
    listBlocks,
  } = categorizeItems(children);

  return [
    createListBlock(
      randomUUID(),
      listContext?.depth,
      listContext?.type,
      [...links, ...contentItemLinks],
      "normal",
      spans,
    ),
    // any existing listBlocks need to be returned as well, because of nested lists
    ...listBlocks,
  ];
};

const processBlock: NodeToPortableText<DomHtmlNode> = (node, children) => {
  const { spans, links, contentItemLinks } = categorizeItems(children);

  return [
    createBlock(randomUUID(), [...links, ...contentItemLinks], node.tagName === "p" ? "normal" : node.tagName, spans),
  ];
};

const processMark: NodeToPortableText<DomHtmlNode> = (node, children) => {
  const { links, contentItemLinks, spans } = categorizeItems(children);
  const key = randomUUID();
  const mark = match(node)
    .when(isExternalLink, () => {
      links.push(createExternalLink(key, node.attributes));
      return key;
    })
    .when(isItemLink, (itemLinkNode) => {
      contentItemLinks.push(createItemLink(key, itemLinkNode.attributes["data-item-id"]));
      return key;
    })
    .otherwise(() => node.tagName);

  const updatedSpans = spans.map(
    s => ({ ...s, marks: [...(s.marks ?? []), mark] } as PortableTextSpan),
  );
  // links are returned to create markDefs in parent blocks higher up the recursion
  return [...updatedSpans, ...links, ...contentItemLinks];
};

const processImage: NodeToPortableText<DomHtmlNode<ImgElementAttributes>> = (node) => {
  /**
   * data-asset-id is present in both MAPI and DAPI, unlike data-image-id, which is unique to DAPI, despite both having identical value.
   * although assets in rich text can also be referenced by external-id or codename, only ID is always returned in the response.
   * if a user plans to transform portable text to mapi compatible HTML format, codenames and ext-ids need to be taken into account anyway though.
   */
  const referenceData = getReferenceData(node.attributes)
    ?? throwError("Error transforming <img> tag: Missing a valid asset reference.");
  const { reference, refType } = referenceData;

  return [
    createImageBlock(
      randomUUID(),
      reference,
      node.attributes["src"],
      node.attributes["alt"],
      refType,
    ),
  ];
};

const processLinkedItemOrComponent: NodeToPortableText<DomHtmlNode<ObjectElementAttributes>> = (node) => {
  const referenceData = getReferenceData(node.attributes)
    ?? throwError("Error transforming <object> tag: Missing a valid item or component reference.");
  const { reference, refType } = referenceData;

  const itemComponentReference: Reference = {
    _type: "reference",
    _ref: reference,
    referenceType: refType,
  };

  // data-rel and data-type specify whether an object is a component or linked item in DAPI and MAPI respectively
  return [
    createComponentOrItemBlock(
      randomUUID(),
      itemComponentReference,
      node.attributes["data-rel"] ?? node.attributes["data-type"],
    ),
  ];
};

const processTableCell: NodeToPortableText<DomHtmlNode> = (_, children) => {
  const { links, contentItemLinks, spans } = categorizeItems(children);

  // If there are spans, wrap them in a block; otherwise, return processed children directly in a table cell
  const cellContent = spans.length
    ? [createBlock(randomUUID(), [...links, ...contentItemLinks], "normal", spans)]
    : children as PortableTextObject[];

  return [createTableCell(randomUUID(), cellContent)];
};

const processTableRow: NodeToPortableText<DomHtmlNode> = (_, children) => {
  const { cells } = categorizeItems(children);

  return [createTableRow(randomUUID(), cells)];
};

const processTable: NodeToPortableText<DomHtmlNode> = (_, children) => {
  const { rows } = categorizeItems(children);

  return [createTable(randomUUID(), rows)];
};

const processText: NodeToPortableText<DomTextNode> = (node) => [createSpan(randomUUID(), [], node.content)];

const ignoreProcessing: NodeToPortableText<DomHtmlNode> = (_, children) => children;

/**
 * Transforms a parsed tree into an array of Portable Text Blocks.
 *
 * @param {DomNode[]} parsedNodes Array of nodes representing the rich text content.
 * @returns {PortableTextObject[]} An array of Portable Text Blocks representing the structured content.
 */
export const nodesToPortableText = (
  parsedNodes: DomNode[],
): PortableTextObject[] =>
  transformNodes(
    parsedNodes,
    transformers,
    { depth: 0, type: "unknown" }, // initialization of list transformation context
    updateListContext,
  ) as PortableTextObject[];

/**
 * Transforms rich text HTML into an array of Portable Text Blocks.
 *
 * @param {string} richText HTML string of Kontent.ai rich text content.
 * @returns {PortableTextObject[]} An array of Portable Text Blocks representing the structured content.
 */
export const transformToPortableText = (
  richText: string,
): PortableTextObject[] => nodesToPortableText(parseHtml(richText));

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
