/**
 * Union type of tags and text nodes.
 */
export type DomNode = DomHtmlNode | DomTextNode;

/**
 * Represents a text node.
 */
export interface DomTextNode {
  type: "text";
  /**
   * Text content.
   */
  content: string;
}

/**
 * Represents a HTML tag.
 */
export interface DomHtmlNode<TAttributes = Record<string, string | undefined>> {
  type: "tag";
  /**
   * Name of the HTML tag.
   */
  tagName: string;
  /**
   * Record of all the HTML tag's attributes and their values.
   */
  attributes: TAttributes & Record<string, string | undefined>;
  /**
   * Array of childnodes.
   */
  children: DomNode[];
}

type DeliverObjectElementAttributes = {
  "data-rel": "component" | "link";
  "data-type": "item";
  "data-codename": string;
  "data-id": never;
  "data-external-id": never;
};

type ManagementObjectElementAttributes = {
  "data-rel": undefined;
  "data-type": "item" | "component";
  "data-id": string;
  "data-codename": never;
  "data-external-id"?: string;
};

export type AssetLinkElementAttributes = {
  "data-asset-id": string;
  "data-asset-external-is"?: string;
  "data-asset-codename"?: string;
  href?: string;
};

export type ItemLinkElementAttributes = {
  "data-item-id": string;
  "data-item-external-id"?: string;
  "data-item-codename"?: string;
  href?: string;
};

export type FigureElementAttributes = {
  "data-asset-id": string;
  "data-image-id"?: string;
};

export type ImgElementAttributes = {
  src: string;
  "data-asset-id": string;
  "data-image-id"?: string;
  "data-asset-codename"?: string;
  "data-asset-external-id"?: string;
  alt?: string;
};

export type InternalLinkElementAttributes =
  | AssetLinkElementAttributes
  | ItemLinkElementAttributes;

export type ObjectElementAttributes =
  | DeliverObjectElementAttributes
  | ManagementObjectElementAttributes;
