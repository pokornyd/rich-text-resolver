import {
  PortableTextMarkComponentOptions,
  PortableTextOptions,
  PortableTextTypeComponentOptions,
  toHTML,
} from "@portabletext/to-html";

import {
  PortableTextComponentOrItem,
  PortableTextExternalLink,
  PortableTextImage,
  PortableTextItemLink,
  PortableTextMark,
  PortableTextObject,
  PortableTextTable,
  throwError,
} from "../../index.js";
import { resolveTable } from "./html.js";

const toManagementApiImage = (image: PortableTextImage) => createFigureTag(image.asset._ref);

const toManagementApiRichTextItem = (richTextItem: PortableTextComponentOrItem) =>
  `<object type="application/kenticocloud" data-type="${richTextItem.dataType}" data-id="${richTextItem.component._ref}"></object>`;

const toManagementApiTable = (table: PortableTextTable) =>
  resolveTable(table, (blocks) => toHTML(blocks, portableTextComponents));

const toManagementApiExternalLink = (children: string, link?: PortableTextExternalLink) =>
  link
    ? `<a ${createExternalLinkAttributes(link)}>${children}</a>`
    : throwError("Mark definition for external link not found.");

const toManagementApiItemLink = (children: string, link?: PortableTextItemLink) =>
  link
    ? `<a data-item-id="${link.reference._ref}">${children}</a>`
    : throwError("Mark definition for item link not found.");

const createImgTag = (assetId: string) => `<img src="#" data-asset-id="${assetId}">`;

const createFigureTag = (assetId: string) => `<figure data-asset-id="${assetId}">${createImgTag(assetId)}</figure>`;

const createExternalLinkAttributes = (link: PortableTextExternalLink) =>
  Object.entries(link).filter(([k]) => k !== "_type" && k !== "_key").map(([k, v]) => `${k}="${v}"`).join(" ");

/**
 * specifies resolution for custom types and marks that are not part of `toHTML` default implementation.
 */
const portableTextComponents: PortableTextOptions = {
  components: {
    types: {
      image: ({ value }: PortableTextTypeComponentOptions<PortableTextImage>) => toManagementApiImage(value),
      component: ({ value }: PortableTextTypeComponentOptions<PortableTextComponentOrItem>) =>
        toManagementApiRichTextItem(value),
      table: ({ value }: PortableTextTypeComponentOptions<PortableTextTable>) => toManagementApiTable(value),
    },
    marks: {
      contentItemLink: ({ children, value }: PortableTextMarkComponentOptions<PortableTextItemLink>) =>
        toManagementApiItemLink(children, value),
      link: ({ children, value }: PortableTextMarkComponentOptions<PortableTextExternalLink>) =>
        toManagementApiExternalLink(children, value),
      sub: ({ children }: PortableTextMarkComponentOptions<PortableTextMark>) => `<sub>${children}</sub>`,
      strong: ({ children }: PortableTextMarkComponentOptions<PortableTextMark>) => `<strong>${children}</strong>`,
      sup: ({ children }: PortableTextMarkComponentOptions<PortableTextMark>) => `<sup>${children}</sup>`,
      em: ({ children }: PortableTextMarkComponentOptions<PortableTextMark>) => `<em>${children}</em>`,
    },
  },
};

/**
 * Transforms Portable Text initially created from Kontent.ai management API rich text back to MAPI-compatible format.
 *
 * This function performs only minimal checks for compatibility and is therefore not suited for conversion of generic HTML
 * or any other rich text other than MAPI format.
 *
 * @param blocks portable text array
 * @returns MAPI-compatible rich text string
 */
export const toManagementApiFormat = (blocks: PortableTextObject[]) => toHTML(blocks, portableTextComponents);
