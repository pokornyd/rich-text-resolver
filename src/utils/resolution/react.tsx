import {
  PortableTextMarkComponent,
  PortableTextReactComponents,
  PortableTextTypeComponent,
  toPlainText,
} from "@portabletext/react";
import React from "react";

import {
  PortableTextComponentOrItem,
  PortableTextExternalLink,
  PortableTextImage,
  PortableTextItemLink,
  PortableTextTable,
  PortableTextTableCell,
  PortableTextTableRow,
} from "../../transformers/transformer-models.js";

type RichTextCustomBlocks = {
  image: PortableTextTypeComponent<PortableTextImage>;
  componentOrItem: PortableTextTypeComponent<PortableTextComponentOrItem>;
  table: PortableTextTypeComponent<PortableTextTable>;
};

type RichTextCustomMarks = {
  contentItemLink: PortableTextMarkComponent<PortableTextItemLink>;
  link: PortableTextMarkComponent<PortableTextExternalLink>;
};

/**
 * Extends `PortableTextReactComponents` type from `@portabletext/react` package with
 * pre-defined types for resolution of Kontent.ai specific custom objects.
 */
export type PortableTextReactResolvers = Partial<
  Omit<PortableTextReactComponents, "types" | "marks"> & {
    types: PortableTextReactComponents["types"] & Partial<RichTextCustomBlocks>;
    marks: PortableTextReactComponents["marks"] & Partial<RichTextCustomMarks>;
  }
>;

export const TableComponent: React.FC<PortableTextTable> = (table) => {
  const renderCell = (cell: PortableTextTableCell, cellIndex: number) => {
    return <td key={cellIndex}>{toPlainText(cell.content)}</td>;
  };

  const renderRow = (row: PortableTextTableRow, rowIndex: number) => {
    return <tr key={rowIndex}>{row.cells.map(renderCell)}</tr>;
  };

  return (
    <table>
      <tbody>{table.rows.map(renderRow)}</tbody>
    </table>
  );
};

export const ImageComponent: React.FC<PortableTextImage> = (image) => (
  <img src={image.asset.url} alt={image.asset.alt ?? ""} />
);
