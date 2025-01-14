import {
  PortableTextImage,
  PortableTextObject,
  PortableTextTable,
  PortableTextTableCell,
  PortableTextTableRow,
  toHTML,
} from "../../../index.js";

/**
 * Renders a portable text table to a Vue virtual DOM node.
 *
 * @param {PortableTextTable} table - The portable text table object to render.
 * @param {(value: PortableTextBlock[]) => string} resolver - A function that resolves
 *        the content of each cell in the table.
 * @param {Function} vueRenderFunction - A Vue render function, typically the `h` function from Vue.
 * @returns {VueNode} The rendered table as a Vue virtual DOM node.
 */
export const resolveTable = (
  table: PortableTextTable,
  vueRenderFunction: Function,
  resolver: (value: PortableTextObject[]) => string = toHTML,
) => {
  const renderCell = (cell: PortableTextTableCell) => {
    const cellContent = resolver(cell.content);
    return vueRenderFunction("td", {}, cellContent);
  };

  const renderRow = (row: PortableTextTableRow) => {
    const cells = row.cells.map(renderCell);
    return vueRenderFunction("tr", {}, cells);
  };

  const renderRows = () => table.rows.map(renderRow);

  return vueRenderFunction("table", {}, renderRows());
};

/**
 * Resolves an image object to a Vue virtual DOM node using a provided Vue render function.
 *
 * @param {PortableTextImage} image - The portable text image object to be rendered.
 * @param {Function} vueRenderFunction - A Vue render function, typically the `h` function from Vue.
 * @param {(image: PortableTextImage) => VueImage} resolver - A function that takes an image object
 *        and returns an object with `src` and `alt` properties, and possibly other HTML attributes.
 *        Default implementation provided if not specified.
 * @returns {VueNode} The resolved image as a Vue virtual DOM node.
 */
export const resolveImage = (
  image: PortableTextImage,
  vueRenderFunction: Function,
  resolver: (image: PortableTextImage) => VueImage = toVueImageDefault,
) => vueRenderFunction("img", resolver(image));

/**
 * Provides a default resolver function for an image object to Vue. Default fallback for `resolver`
 * argument of `resolveImage` function.
 *
 * @param {PortableTextImage} image - The portable text image object to be rendered.
 * @returns {VueImage} An object representing the image, containing `src` and `alt` properties,
 *          and potentially other HTML attributes.
 */
export const toVueImageDefault = (image: PortableTextImage): VueImage => ({
  src: image.asset.url,
  alt: image.asset.alt || "",
});

type VueImage = { src: string; alt: string; [key: string]: any };
