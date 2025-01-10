import {
  ArbitraryTypedObject,
  PortableTextBlockStyle,
  PortableTextListItemType,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from "@portabletext/types";
import ShortUniqueId from "short-unique-id";

import {
  ModularContentType,
  PortableTextComponentOrItem,
  PortableTextExternalLink,
  PortableTextImage,
  PortableTextItemLink,
  PortableTextMark,
  PortableTextObject,
  PortableTextStrictBlock,
  PortableTextStrictListItemBlock,
  PortableTextTable,
  PortableTextTableCell,
  PortableTextTableRow,
  Reference,
  ShortGuid,
  TextStyleElement,
} from "../transformers/index.js";

export type ResolverFunction<T extends ArbitraryTypedObject> = (
  value: T,
) => string;

/**
 * Recursively traverses and optionally transforms a Portable Text structure using a provided
 * callback function. The callback is applied to each node in the structure. If the callback
 * does not modify a node, the original node is used.
 *
 * @template T The type of the Portable Text nodes, defaulting to PortableTextObject.
 * @param {T[]} nodes - Array of Portable Text objects.
 *   It can be a default Portable Text object or a custom type that extends from it.
 * @param {(object: T) => ArbitraryTypedObject | undefined} callback - A callback function
 *   invoked for each node in the Portable Text structure. It can return a modified version
 *   of the node or `undefined` if no modifications are to be made.
 * @returns {ArbitraryTypedObject} - A modified copy of the original portable text structure.
 */
export const traversePortableText = <
  T extends ArbitraryTypedObject = PortableTextObject,
>(
  nodes: T[],
  callback: (node: T) => ArbitraryTypedObject | undefined,
): ArbitraryTypedObject[] => {
  return nodes.map((node) => {
    // Apply the callback to the current node. If it returns undefined, clone the node.
    const traversedNode = callback(node) ?? { ...node };

    Object.keys(traversedNode).forEach((key) => {
      // marks is an array of strings that shouldn't be modified, therefore omit from traversal
      if (Array.isArray(traversedNode[key]) && key !== "marks") {
        traversedNode[key] = traversePortableText(
          traversedNode[key],
          callback,
        );
      }
    });

    return traversedNode;
  });
};

export const createSpan = (
  guid: ShortGuid,
  marks?: string[],
  text?: string,
): PortableTextSpan => ({
  _type: "span",
  _key: guid,
  marks: marks || [],
  text: text || "",
});

export const createBlock = (
  guid: ShortGuid,
  markDefs?: PortableTextMarkDefinition[],
  style?: PortableTextBlockStyle,
  children?: PortableTextSpan[],
): PortableTextStrictBlock => ({
  _type: "block",
  _key: guid,
  markDefs: markDefs || [],
  style: style || "normal",
  children: children || [],
});

export const createListBlock = (
  guid: ShortGuid,
  level?: number,
  listItem?: PortableTextListItemType,
  markDefs?: PortableTextMarkDefinition[],
  style?: string,
  children?: PortableTextSpan[],
): PortableTextStrictListItemBlock => ({
  _type: "block",
  _key: guid,
  markDefs: markDefs || [],
  level: level,
  listItem: listItem ?? "unknown",
  style: style || "normal",
  children: children || [],
});

export const createImageBlock = (
  guid: ShortGuid,
  reference: string,
  url: string,
  alt?: string,
  referenceType?: "codename" | "external-id" | "id",
): PortableTextImage => ({
  _type: "image",
  _key: guid,
  asset: {
    _type: "reference",
    _ref: reference,
    url,
    alt,
    referenceType,
  },
});

export const createExternalLink = (
  guid: ShortGuid,
  attributes: Readonly<Record<string, string | undefined>>,
): PortableTextExternalLink => ({
  _key: guid,
  _type: "link",
  ...attributes,
});

export const createItemLink = (
  guid: ShortGuid,
  reference: string,
): PortableTextItemLink => ({
  _key: guid,
  _type: "contentItemLink",
  reference: {
    _type: "reference",
    _ref: reference,
  },
});

export const createTable = (
  guid: ShortGuid,
  rows?: PortableTextTableRow[],
): PortableTextTable => ({
  _key: guid,
  _type: "table",
  rows: rows ?? [],
});

export const createTableRow = (guid: ShortGuid, cells?: PortableTextTableCell[]): PortableTextTableRow => ({
  _key: guid,
  _type: "row",
  cells: cells ?? [],
});

export const createTableCell = (
  guid: ShortGuid,
  content?: PortableTextObject[],
): PortableTextTableCell => ({
  _key: guid,
  _type: "cell",
  content: content ?? [],
});

export const createMark = (
  guid: ShortGuid,
  value: TextStyleElement | string,
  childCount: number,
): PortableTextMark => ({
  _type: "mark",
  _key: guid,
  value: value,
  childCount: childCount,
});

export const createComponentOrItemBlock = (
  guid: ShortGuid,
  reference: Reference,
  dataType: ModularContentType,
): PortableTextComponentOrItem => ({
  _type: "componentOrItem",
  _key: guid,
  dataType,
  component: reference,
});

export const getAllNewLineAndWhiteSpace = /\n\s*/g;

export const { randomUUID } = new ShortUniqueId({ length: 10 });
