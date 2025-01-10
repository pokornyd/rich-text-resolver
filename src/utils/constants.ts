export const textStyleElements = ["strong", "em", "sub", "sup", "code"] as const;
export const blockElements = ["p", "h1", "h2", "h3", "h4", "h5", "h6"] as const;
export const tableElements = ["table", "td", "tr"] as const;
export const lineBreakElement = "br" as const;
export const anchorElement = "a" as const;
export const objectElement = "object" as const;
export const assetElement = "img" as const;
export const listItemElement = "li" as const;
export const listTypeElements = ["ul", "ol"] as const;
export const ignoredElements = ["figure", "tbody", ...listTypeElements] as const;
export const markElements = [...textStyleElements, anchorElement] as const;
export const validElements = [
  ...blockElements,
  ...ignoredElements,
  ...markElements,
  ...tableElements,
  ...listTypeElements,
  assetElement,
  objectElement,
  lineBreakElement,
  listItemElement,
] as const;
