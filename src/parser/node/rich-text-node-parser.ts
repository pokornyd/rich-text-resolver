import * as NodeHtmlParser from "node-html-parser";
import { Node } from "node-html-parser";

import { getAllNewLineAndWhiteSpace, throwError } from "../../utils/common-utils.js";
import { isElementNode, isRootNode, isTextNode } from "../../utils/node-parser-utils.js";
import { DomNode } from "../parser-models.js";

export const parse = (input: string): DomNode[] => {
  const node = NodeHtmlParser.parse(input.replaceAll(getAllNewLineAndWhiteSpace, ""));

  return isRootNode(node)
    ? node.childNodes.flatMap(parseInternal)
    : throwError("Cannot parse node that is not a root");
};

const parseInternal = (node: Node): DomNode => {
  if (isElementNode(node)) {
    return {
      tagName: node.tagName.toLowerCase(),
      attributes: node.attributes,
      children: node.childNodes.flatMap(parseInternal),
      type: "tag",
    };
  }

  if (isTextNode(node)) {
    return {
      content: node.text,
      type: "text",
    };
  }

  throw new Error("Unknown node");
};
