import {
  BlockElement,
  blockElements,
  DomHtmlNode,
  DomNode,
  DomTextNode,
  FigureElementAttributes,
  ImgElementAttributes,
  ItemLinkElementAttributes,
  MarkElement,
  markElements,
  ObjectElementAttributes,
  ValidElement,
  validElements,
} from "../index.js";

export const isOrderedListBlock = (node: DomHtmlNode): boolean => node.tagName === "ol";

export const isUnorderedListBlock = (node: DomHtmlNode): boolean => node.tagName === "ul";

export const isListBlock = (node: DomHtmlNode): boolean => isUnorderedListBlock(node) || isOrderedListBlock(node);

export const isListItem = (node: DomHtmlNode): boolean => node.tagName === "li";

export const isExternalLink = (node: DomHtmlNode): boolean => isAnchor(node) && !node.attributes["data-item-id"];

export const isAnchor = (node: DomHtmlNode): boolean => node.tagName === "a";

export const isTableCell = (node: DomHtmlNode): boolean => isElement(node) && node.tagName === "td";

export const isLineBreak = (node: DomHtmlNode): boolean => isElement(node) && node.tagName === "br";

export const isBlockElement = (node: DomHtmlNode): boolean =>
  isElement(node) && blockElements.includes(node.tagName as BlockElement);

export const isValidElement = (node: DomHtmlNode): boolean =>
  isElement(node) && validElements.includes(node.tagName as ValidElement);

export const isMarkElement = (node: DomHtmlNode): boolean =>
  isElement(node) && markElements.includes(node.tagName as MarkElement);

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
  isElement(node)
  && node.tagName === "object"
  && node.attributes["type"] === "application/kenticocloud";

/**
 * Returns `true` if the node is a rich text image node (`<figure></figure>`) and narrows type guard.
 */
export const isImage = (node: DomNode): node is DomHtmlNode<FigureElementAttributes> =>
  isElement(node)
  && node.tagName === "figure"
  && node.attributes["data-asset-id"] !== undefined;

/**
 * Returns `true` if the node is a link to a content item and narrows type guard.
 */
export const isItemLink = (node: DomHtmlNode): node is DomHtmlNode<ItemLinkElementAttributes> =>
  isAnchor(node) && node.attributes["data-item-id"] !== undefined;

/**
 * Returns `true` if the node is a Kontent.ai rich text `img` node and narrows type guard.
 */
export const isNestedImg = (node?: DomNode): node is DomHtmlNode<ImgElementAttributes> =>
  node !== undefined
  && isElement(node)
  && node.tagName === "img"
  && node.attributes["data-asset-id"] !== undefined;

export const throwError = (msg: string) => {
  throw new Error(msg);
};
