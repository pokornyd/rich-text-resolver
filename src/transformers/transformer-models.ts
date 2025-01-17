import {
  ArbitraryTypedObject,
  PortableTextBlock,
  PortableTextListItemBlock,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from "@portabletext/types";

import {
  blockElements,
  ignoredElements,
  listTypeElements,
  markElements,
  textStyleElements,
  validElements,
} from "../utils/constants.js";

type LiteralOrString<T extends string> = T | (string & {});

/**
 * A reference to various Kontent.ai objects in rich text
 */
export interface Reference extends ArbitraryTypedObject {
  _type: "reference";
  /**
   * An identifier of the referenced object
   */
  _ref: string;
  /**
   * Type of reference (codename, id or external id)
   */
  referenceType: "codename" | "external-id" | "id";
}

/**
 * Represents an asset object used in rich text.
 */
export interface AssetReference extends Reference {
  /**
   * URL of an asset.
   */
  url: string;
  /**
   * Alternate image text.
   */
  alt?: string;
}

/**
 * Represents a mark definition for a link to an external URL in rich text element. This includes asset, phone and email links.
 */
export interface PortableTextExternalLink extends PortableTextMarkDefinition {
  _type: "link";
  href?: string;
  rel?: string;
  title?: string;
}

/**
 * Represents a mark definition for a link to a content item in rich text element.
 */
export interface PortableTextItemLink extends PortableTextMarkDefinition {
  _type: "contentItemLink";
  reference: Reference;
}

/**
 * Represents an inline image used in rich text element.
 */
export interface PortableTextImage extends ArbitraryTypedObject {
  _type: "image";
  /**
   * Reference to an asset used in rich text.
   */
  asset: AssetReference;
}

/**
 * Represents a table in rich text element.
 */
export interface PortableTextTable extends ArbitraryTypedObject {
  _type: "table";
  /**
   * Array of table row objects.
   */
  rows: PortableTextTableRow[];
}

/**
 * Represents a single row of cells in a portable text table.
 */
export interface PortableTextTableRow extends ArbitraryTypedObject {
  _type: "row";
  /**
   * Array of table cells.
   */
  cells: PortableTextTableCell[];
}

/**
 * Represents a single cell in a portable text table.
 */
export interface PortableTextTableCell extends ArbitraryTypedObject {
  _type: "cell";
  /**
   * All blocks belonging to a cell.
   */
  content: PortableTextObject[];
}

/**
 * Represents a component or a linked item used in rich text.
 */
export interface PortableTextComponentOrItem extends ArbitraryTypedObject {
  _type: "componentOrItem";
  /**
   * `component` for components or `item | link` for linked items
   */
  dataType: ModularContentType;
  /**
   * Reference to a component or a linked item.
   */
  component: Reference;
}

/**
 * Represents either a style (strong, em, etc.) or references a link object in markDefs array
 */
export interface PortableTextMark extends ArbitraryTypedObject {
  _type: "mark";
  value: LiteralOrString<TextStyleElement>; // value can be a shortguid (string) if a mark references a link
}

/**
 * Represents a block, usually a paragraph or heading.
 *
 * Narrows the `_type` to `block` for type guard purposes.
 */
export interface PortableTextStrictBlock extends Omit<PortableTextBlock, "_type">, ArbitraryTypedObject {
  _type: "block";
}

/**
 * Represents a list item block. Similar to regular block but requires `listItem` property.
 *
 * Narrows the `_type` to `block` for type guard purposes.
 */
export interface PortableTextStrictListItemBlock
  extends Omit<PortableTextListItemBlock, "_type">, ArbitraryTypedObject {
  _type: "block";
}

export type PortableTextLink =
  | PortableTextItemLink
  | PortableTextExternalLink;

/**
 * Union of all default, top-level portable text object types.
 */
export type PortableTextObject =
  | PortableTextComponentOrItem
  | PortableTextImage
  | PortableTextTable
  | PortableTextStrictBlock
  | PortableTextStrictListItemBlock;

/**
 * Union of all nested portable text object types.
 */
export type PortableTextInternalObject =
  | Reference
  | PortableTextMark
  | PortableTextLink
  | PortableTextTableRow
  | PortableTextTableCell
  | PortableTextSpan;

/**
 * Union of all default portable text object types.
 */
export type PortableTextItem = PortableTextObject | PortableTextInternalObject;

/**
 * `link` represent a rich text linked item in delivery API context
 */
type DeliveryLinkedItem = "link";

/**
 * `item` represents a rich text linked item in management API context
 */
type ManagementLinkedItem = "item";

/**
 * Represents type of modular content (items, components) in different rich text contexts
 */
export type ModularContentType = "component" | DeliveryLinkedItem | ManagementLinkedItem;

/**
 * Re-exports all types from the package, to allow both custom types and
 * predefined types to be imported from a single point via "exports" in package.json.
 */
export * from "@portabletext/types";

export type TextStyleElement = typeof textStyleElements[number];
export type BlockElement = typeof blockElements[number];
export type IgnoredElement = typeof ignoredElements[number];
export type MarkElement = typeof markElements[number];
export type ValidElement = typeof validElements[number];
export type ListTypeElement = typeof listTypeElements[number];
export type ShortGuid = string;
