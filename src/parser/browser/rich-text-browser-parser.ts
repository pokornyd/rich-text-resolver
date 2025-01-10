import {
  convertDomNodeAttributes,
  getAllNewLineAndWhiteSpace,
  isElementNode,
  isRootNode,
  isTextNode,
  throwError,
} from "../../utils/index.js";
import { DomNode } from "../parser-models.js";

export const parse = (input: string): DomNode[] => {
  const parser = new DOMParser();
  const sanitizedInput = input.replaceAll(getAllNewLineAndWhiteSpace, "");
  const document = parser.parseFromString(sanitizedInput, "text/html");

  return isRootNode(document) && document.body.firstChild
    ? Array.from(document.body.children).flatMap(parseInternal)
    : throwError("Cannot parse a node that is not a root node");
};

const parseInternal = (document: Node): DomNode => {
  if (isElementNode(document)) {
    return {
      tagName: document.tagName.toLowerCase(),
      attributes: document.hasAttributes() ? convertDomNodeAttributes(document.attributes) : {},
      children: document.hasChildNodes() ? Array.from(document.childNodes).flatMap(parseInternal) : [],
      type: "tag",
    };
  }

  if (isTextNode(document)) {
    return {
      content: document.nodeValue ?? "",
      type: "text",
    };
  }

  throw new Error("Unknown node");
};
