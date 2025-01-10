import {
  PortableTextHtmlComponents,
  PortableTextMarkComponent,
  PortableTextOptions,
  PortableTextTypeComponent,
} from "@portabletext/to-html";

import {
  PortableTextComponentOrItem,
  PortableTextExternalLink,
  PortableTextImage,
  PortableTextItemLink,
  PortableTextObject,
  PortableTextTable,
  PortableTextTableCell,
  PortableTextTableRow,
} from "../../index.js";

type RichTextCustomBlocks = {
  image: PortableTextTypeComponent<PortableTextImage>;
  componentOrItem: PortableTextTypeComponent<PortableTextComponentOrItem>;
  table: PortableTextTypeComponent<PortableTextTable>;
};

type RichTextCustomMarks = {
  contentItemLink: PortableTextMarkComponent<PortableTextItemLink>;
  link: PortableTextMarkComponent<PortableTextExternalLink>;
};

type RichTextHtmlComponents = Omit<PortableTextHtmlComponents, "types" | "marks"> & {
  types: PortableTextHtmlComponents["types"] & RichTextCustomBlocks;
  marks: PortableTextHtmlComponents["marks"] & RichTextCustomMarks;
};

/**
 * Extends `PortableTextOptions` type from `toHTML` package with
 * pre-defined types for resolution of Kontent.ai specific custom objects.
 */
export type PortableTextHtmlResolvers = Omit<PortableTextOptions, "components"> & {
  components: Partial<RichTextHtmlComponents>;
};

/**
 * Renders a portable text table to HTML.
 *
 * @param {PortableTextTable} table - The portable text table object to render.
 * @param {(value: PortableTextObject[]) => string} resolver - A function that resolves
 *        the content of each cell in the table.
 * @returns {string} The rendered table as an HTML string.
 */
export const resolveTable = (
  table: PortableTextTable,
  resolver: (value: PortableTextObject[]) => string,
) => {
  const renderCell = (cell: PortableTextTableCell) => {
    const cellContent = resolver(cell.content);
    return `<td>${cellContent}</td>`;
  };

  const renderRow = (row: PortableTextTableRow) => {
    const cells = row.cells.map(renderCell);
    return `<tr>${cells.join("")}</tr>`;
  };

  const renderRows = () => table.rows.map(renderRow).join("");

  return `<table><tbody>${renderRows()}</tbody></table>`;
};

/**
 * Resolves an image object to HTML.
 *
 * @param {PortableTextImage} image - The portable text image object to be rendered.
 * @param {(image: PortableTextImage) => string} resolver - A resolver function that returns the image as an HTML string. Default implementation provided if not specified.
 * @returns {string} The resolved image as an HTML string.
 */
export const resolveImage = (
  image: PortableTextImage,
  resolver: (image: PortableTextImage) => string = toHTMLImageDefault,
): string => resolver(image);

/**
 * Provides a default resolver function for an image object to HTML. This function can be used as
 * a default argument for the `resolveImage` function.
 *
 * @param {PortableTextImage} image - The portable text image object to be rendered.
 * @returns {VueImage} An object representing the image, containing `src` and `alt` properties,
 *          and potentially other HTML attributes.
 */
export const toHTMLImageDefault = (image: PortableTextImage): string =>
  `<img src="${image.asset.url}" alt="${image.asset.alt}">`;
