import { match, P } from "ts-pattern";

import {
  DomHtmlNode,
  DomNode,
  DomTextNode,
  ItemLinkElementAttributes,
  ObjectElementAttributes,
} from "../parser/parser-models.js";
import { BlockElement, MarkElement, ValidElement } from "../transformers/transformer-models.js";
import { blockElements, markElements, validElements } from "../utils/constants.js";

export const isOrderedListBlock = (node: DomHtmlNode): boolean => node.tagName === "ol";

export const isUnorderedListBlock = (node: DomHtmlNode): boolean => node.tagName === "ul";

export const isListBlock = (node: DomHtmlNode): boolean => isUnorderedListBlock(node) || isOrderedListBlock(node);

export const isListItem = (node: DomHtmlNode): boolean => node.tagName === "li";

// any link besides item link is considered external for portable text transformation purposes
export const isExternalLink = (node: DomHtmlNode): boolean =>
  isAnchor(node) && getItemLinkReferenceData(node.attributes) === null;

export const isAnchor = (node: DomHtmlNode): boolean => node.tagName === "a";

export const isTableCell = (node: DomHtmlNode): boolean => node.tagName === "td";

export const isLineBreak = (node: DomHtmlNode): boolean => node.tagName === "br";

export const isBlockElement = (node: DomHtmlNode): boolean => blockElements.includes(node.tagName as BlockElement);

export const isValidElement = (node: DomHtmlNode): boolean => validElements.includes(node.tagName as ValidElement);

export const isMarkElement = (node: DomHtmlNode): boolean => markElements.includes(node.tagName as MarkElement);

/**
 * Returns `true` for text nodes and type guards the node as `DomTextNode`.
 */
export const isText = (node: DomNode): node is DomTextNode => node.type === "text";

/**
 * Returns `true` for HTML nodes and type guards the node as `DomHtmlNode`.
 */
export const isElement = (node: DomNode): node is DomHtmlNode => node.type === "tag";

/**
 * Returns `true` if the node is a linked item node (`<object></object>`) and narrows type guard.
 */
export const isLinkedItemOrComponent = (node: DomNode): node is DomHtmlNode<ObjectElementAttributes> =>
  match(node)
    .with({
      type: "tag",
      tagName: "object",
      attributes: P.when(attrs => attrs["type"] === "application/kenticocloud"),
    }, () => true)
    .otherwise(() => false);

/**
 * Returns `true` if the node is a rich text image node (`<figure></figure>`) and narrows type guard.
 */
export const isImage = (node: DomNode): node is DomHtmlNode =>
  match(node)
    .with({
      type: "tag",
      tagName: "figure",
      attributes: P.when(attrs =>
        typeof attrs["data-asset-id"] === "string"
        || typeof attrs["data-asset-external-id"] === "string"
        || typeof attrs["data-asset-codename"] === "string"
      ),
    }, () => true)
    .otherwise(() => false);

/**
 * Returns `true` if the node is a link to a content item and narrows type guard.
 */
export const isItemLink = (node: DomHtmlNode): node is DomHtmlNode<ItemLinkElementAttributes> =>
  match(node)
    .with({
      type: "tag",
      tagName: "a",
      attributes: P.when(attrs =>
        typeof attrs["data-item-id"] === "string"
        || typeof attrs["data-item-external-id"] === "string"
        || typeof attrs["data-item-codename"] === "string"
      ),
    }, () => true)
    .otherwise(() => false);

export const throwError = (msg: string) => {
  throw new Error(msg);
};

export const isAssetLink = (node: DomHtmlNode): node is DomHtmlNode =>
  match(node)
    .with({
      type: "tag",
      tagName: "a",
      attributes: P.when(attrs =>
        typeof attrs["data-asset-id"] === "string"
        || typeof attrs["data-asset-external-id"] === "string"
        || typeof attrs["data-asset-codename"] === "string"
      ),
    }, () => true)
    .otherwise(() => false);

const createReferenceDataGetter =
  (refAttributeTypes: ReadonlyArray<{ attr: string; refType: "id" | "codename" | "external-id" }>) =>
  (attributes: Record<string, string | undefined>): ReferenceData | null => {
    const refInfo = refAttributeTypes.find(({ attr }) => attributes[attr]);

    return refInfo
      ? { reference: attributes[refInfo.attr]!, refType: refInfo.refType }
      : null;
  };

const assetReferences = [
  { attr: "data-asset-id", refType: "id" },
  { attr: "data-asset-external-id", refType: "external-id" },
  { attr: "data-asset-codename", refType: "codename" },
] as const;

const itemOrComponentReferences = [
  { attr: "data-id", refType: "id" },
  { attr: "data-external-id", refType: "external-id" },
  { attr: "data-codename", refType: "codename" },
] as const;

const itemLinkReferences = [
  { attr: "data-item-id", refType: "id" },
  { attr: "data-item-external-id", refType: "external-id" },
  { attr: "data-item-codename", refType: "codename" },
] as const;

export const getAssetReferenceData = createReferenceDataGetter(assetReferences);
export const getItemOrComponentReferenceData = createReferenceDataGetter(itemOrComponentReferences);
export const getItemLinkReferenceData = createReferenceDataGetter(itemLinkReferences);

type ReferenceData = {
  reference: string;
  refType: "id" | "external-id" | "codename";
};

export const getAllNewLineAndWhiteSpace = /\n\s*/g;
