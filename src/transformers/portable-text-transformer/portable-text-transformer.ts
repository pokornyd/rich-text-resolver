import { match, P } from "ts-pattern";

import { parseHTML } from "../../parser/index.js";
import {
  DomHtmlNode,
  DomNode,
  DomTextNode,
  ImgElementAttributes,
  ObjectElementAttributes,
} from "../../parser/parser-models.js";
import {
  getAssetReferenceData,
  getItemLinkReferenceData,
  getItemOrComponentReferenceData,
  isElement,
  isExternalLink,
  isItemLink,
  isListBlock,
  throwError,
} from "../../utils/common-utils.js";
import { blockElements, ignoredElements, textStyleElements } from "../../utils/constants.js";
import {
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
  randomUUID,
} from "../../utils/transformer-utils.js";
import {
  BlockElement,
  IgnoredElement,
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
} from "../transformer-models.js";

type ListContext = {
  depth: number;
  type: "number" | "bullet" | "unknown";
};

type NodeToPortableText<TNode extends DomNode> = TNode extends DomHtmlNode
  ? (node: TNode, children: PortableTextItem[], context: ListContext) => PortableTextItem[]
  : (node: TNode) => PortableTextSpan[];

type PortableTextTransformers = {
  text: NodeToPortableText<DomTextNode>;
  tag: Record<string, NodeToPortableText<DomHtmlNode<any>>>;
};

const transformNodes = (
  nodes: DomNode[],
  transformers: PortableTextTransformers,
  context: ListContext,
): PortableTextItem[] =>
  nodes.flatMap(node =>
    match(node)
      .with({ type: "text" }, textNode => transformers.text(textNode))
      .with({ type: "tag" }, tagNode => {
        const updatedContext = updateListContext(tagNode, context);
        const children = transformNodes(tagNode.children, transformers, updatedContext);
        const transformer = transformers.tag[tagNode.tagName];
        if (!transformer) {
          throw new Error(`No transformer specified for tag: ${tagNode.tagName}`);
        }

        return transformer(tagNode, children, updatedContext);
      })
      .exhaustive()
  );

export const categorizeItems = (items: PortableTextItem[]) => {
  const initialAcc = {
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
  };

  return items.reduce((acc, item) => {
    match(item)
      .with({ _type: "block", listItem: P.string }, (listBlock) => {
        acc.listBlocks.push(listBlock as PortableTextStrictListItemBlock);
      })
      .with({ _type: "block" }, (block) => {
        acc.blocks.push(block);
      })
      .with({ _type: "link" }, (link) => {
        acc.links.push(link);
      })
      .with({ _type: "contentItemLink" }, (contentItemLink) => {
        acc.contentItemLinks.push(contentItemLink);
      })
      .with({ _type: "span" }, (span) => {
        acc.spans.push(span);
      })
      .with({ _type: "mark" }, (mark) => {
        acc.marks.push(mark);
      })
      .with({ _type: "cell" }, (cell) => {
        acc.cells.push(cell);
      })
      .with({ _type: "row" }, (row) => {
        acc.rows.push(row);
      })
      .with({ _type: "image" }, (image) => {
        acc.images.push(image);
      })
      .with({ _type: "componentOrItem" }, (componentOrItem) => {
        acc.componentsOrItems.push(componentOrItem);
      })
      .with({ _type: "table" }, (table) => {
        acc.tables.push(table);
      })
      .with({ _type: "reference" }, (reference) => {
        acc.references.push(reference);
      })
      .exhaustive();

    return acc;
  }, initialAcc);
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
      listContext.depth,
      listContext.type,
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
    .when(isExternalLink, () => { // this includes asset, email, phone and regular url links
      links.push(createExternalLink(key, node.attributes));
      return key;
    })
    .when(isItemLink, (itemLinkNode) => {
      const { reference, refType } = getItemLinkReferenceData(itemLinkNode.attributes)
        ?? throwError("Error transforming item link: Missing a valid item reference.");
      contentItemLinks.push(createItemLink(key, reference, refType));
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
  const referenceData = getAssetReferenceData(node.attributes)
    ?? throwError("Error transforming <img> tag: Missing a valid asset reference.");
  const { reference, refType } = referenceData;

  return [
    createImageBlock(
      randomUUID(),
      reference,
      node.attributes["src"],
      refType,
      node.attributes["alt"],
    ),
  ];
};

const processLinkedItemOrComponent: NodeToPortableText<DomHtmlNode<ObjectElementAttributes>> = (node) => {
  const referenceData = getItemOrComponentReferenceData(node.attributes)
    ?? throwError("Error transforming <object> tag: Missing a valid item or component reference.");
  const { reference, refType } = referenceData;

  // data-rel and data-type specify whether an object is a component or linked item in DAPI and MAPI respectively
  const objectType = node.attributes["data-rel"] ? node.attributes["data-rel"] : node.attributes["data-type"];
  const itemComponentReference: Reference = {
    _type: "reference",
    _ref: reference,
    referenceType: refType,
  };

  return [
    createComponentOrItemBlock(
      randomUUID(),
      itemComponentReference,
      objectType,
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
 * Transforms rich text HTML into an array of Portable Text Blocks.
 *
 * @param {string} richText HTML string of Kontent.ai rich text content.
 * @returns {PortableTextObject[]} An array of Portable Text Blocks representing the structured content.
 */
export const transformToPortableText = (
  richText: string,
): PortableTextObject[] => {
  const parsedNodes = parseHTML(richText);

  return transformNodes(parsedNodes, transformers, { depth: 0, type: "unknown" }) as PortableTextObject[];
};

const transformers: PortableTextTransformers = {
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
