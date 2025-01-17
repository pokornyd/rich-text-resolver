import {
  PortableText as PortableTextDefault,
  PortableTextMarkComponent,
  PortableTextProps,
  PortableTextReactComponents,
  PortableTextTypeComponent,
  toPlainText,
} from "@portabletext/react";
import React, { JSX } from "react";

import {
  PortableTextBlock,
  PortableTextComponentOrItem,
  PortableTextExternalLink,
  PortableTextImage,
  PortableTextItemLink,
  PortableTextTable,
  PortableTextTableCell,
  PortableTextTableRow,
  TypedObject,
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

const defaultComponentResolvers: PortableTextReactResolvers = {
  types: {
    image: ({ value }) => <ImageComponent {...value} />,
    table: ({ value }) => <TableComponent {...value} />,
  },
  marks: {
    link: ({ value, children }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _key, _type, ...attributes } = value!;
      return <a {...attributes}>{children}</a>;
    },
    sup: ({ children }) => <sup>{children}</sup>,
    sub: ({ children }) => <sub>{children}</sub>,
  },
};

/**
 * Wrapper around `PortableText` component from `@portabletext/react` package, with default resolvers for `sup` and `sub` marks added.
 *
 * @param param0 see `PortableTextProps` from `@portabletext/react` package
 * @returns JSX element
 */
export const PortableText = <B extends TypedObject = PortableTextBlock>({
  value: input,
  components: componentOverrides,
  listNestingMode,
  onMissingComponent: missingComponentHandler,
}: PortableTextProps<B>): JSX.Element => {
  const mergedComponentResolvers: PortableTextReactResolvers = {
    types: {
      ...defaultComponentResolvers.types,
      ...componentOverrides?.types,
    },
    marks: {
      ...defaultComponentResolvers.marks,
      ...componentOverrides?.marks,
    },
  };

  return (
    <PortableTextDefault
      value={input}
      components={mergedComponentResolvers}
      listNestingMode={listNestingMode}
      onMissingComponent={missingComponentHandler}
    />
  );
};
