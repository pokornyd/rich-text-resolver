import { match } from "ts-pattern";

import { DomHtmlNode, DomNode } from "../../parser/parser-models.js";

export type NodeToHtml<TContext = unknown> = (
  node: DomHtmlNode<any>,
  children: string,
  context?: TContext,
) => string;

export type NodeToHtmlAsync<TContext = unknown> = (
  node: DomHtmlNode<any>,
  children: string,
  context?: TContext,
) => Promise<string>;

/**
 * A record of functions that convert an HTML node and its children to a string.
 *
 * @template TContext - The type of contextual data passed to the conversion functions.
 */
export type NodeToHtmlMap<TContext = unknown> = Record<string, NodeToHtml<TContext>>;

/**
 * A record of async functions that convert an HTML node and its children to a string.
 *
 * @template TContext - The type of contextual data passed to the conversion functions.
 */
export type AsyncNodeToHtmlMap<TContext = unknown> = Record<string, NodeToHtmlAsync<TContext>>;

/**
 * Recursively traverses an array of `DomNode`, transforming each tag node to its HTML string representation, including all attributes.
 * You can override transformation for individual tags by providing a custom transformer via `transformers` parameter. Text nodes are transformed automatically.
 * An optional context object and a handler to update it before a tag node is processed can be provided.
 *
 * @template TContext - The type of the context object used during traversal.
 *
 * @param {DomNode[]} nodes - The array of `DomNode` elements to traverse and transform.
 * @param {NodeToHtmlMap<TContext>} transformers - Record of `tag : function` pairs defining transformations for individual tags.
 * A wildcard `*` tag can be used for defining a transformation for all tags for which a custom transformation wasn't specified.
 * @param {TContext} [context={}] - The initial context object passed to transformers and updated by the `contextHandler`. Empty object by default.
 * @param {(node: DomNode, context: TContext) => TContext} [contextHandler] - An optional function that updates the context based on the current tag node.
 *
 * @returns {string} HTML or other string result of the transformation.
 *
 * @remarks
 * - The function traverses and transforms the nodes in a depth-first manner.
 * - If a `contextHandler` is provided, it updates the context before passing it to child nodes traversal.
 */
export const nodesToHTML = <TContext>(
  nodes: DomNode[],
  transformers: NodeToHtmlMap<TContext>,
  context: TContext = {} as TContext,
  contextHandler?: (node: DomNode, context: TContext) => TContext,
): string =>
  nodes.map(node =>
    match(node)
      .with({ type: "text" }, textNode => textNode.content)
      .with({ type: "tag" }, tagNode => {
        const updatedContext = contextHandler?.(tagNode, context) ?? context;
        const children = nodesToHTML(tagNode.children, transformers, updatedContext, contextHandler);
        const transformer = transformers[tagNode.tagName] ?? transformers["*"];

        return (
          transformer?.(tagNode, children, updatedContext)
            ?? `<${tagNode.tagName}${formatAttributes(tagNode.attributes)}>${children}</${tagNode.tagName}>`
        );
      })
      .exhaustive()
  ).join("");

/**
 * Recursively traverses an array of `DomNode`, transforming each tag node to its HTML string representation in an asynchronous manner.
 * You can override transformation for individual tags by providing a custom transformer via `transformers` parameter. Text nodes are transformed automatically.
 * An optional context object and a handler to update it before a tag node is processed can be provided.
 *
 * @template TContext - The type of the context object used during traversal.
 *
 * @param {DomNode[]} nodes - The array of `DomNode` elements to traverse and transform.
 * @param {AsyncNodeToHtmlMap<TContext>} transformers - Record of `tag : function` pairs defining async transformations for individual tags.
 * A wildcard `*` tag can be used for defining a transformation for all tags for which a custom transformation wasn't specified.
 * @param {TContext} [context={}] - The initial context object passed to transformers and updated by the `contextHandler`. Empty object by default.
 * @param {(node: DomNode, context: TContext) => TContext} [contextHandler] - An optional function that updates the context based on the current tag node.
 *
 * @returns {Promise<string>} HTML or other string result of the transformation.
 *
 * @remarks
 * - The function traverses and transforms the nodes in a depth-first manner.
 * - If a `contextHandler` is provided, it updates the context before passing it to child nodes traversal.
 */
export const nodesToHTMLAsync = async <TContext>(
  nodes: DomNode[],
  transformers: AsyncNodeToHtmlMap<TContext>,
  context: TContext = {} as TContext,
  contextHandler?: (node: DomNode, context: TContext) => TContext,
): Promise<string> =>
  (
    await Promise.all(
      nodes.map(async node =>
        match(node)
          .with({ type: "text" }, textNode => textNode.content)
          .with({ type: "tag" }, async tagNode => {
            const updatedContext = contextHandler?.(tagNode, context) ?? context;
            const children = await nodesToHTMLAsync(tagNode.children, transformers, updatedContext, contextHandler);
            const transformer = transformers[tagNode.tagName] ?? transformers["*"];

            return (
              await transformer?.(tagNode, children, updatedContext)
                ?? `<${tagNode.tagName}${formatAttributes(tagNode.attributes)}>${children}</${tagNode.tagName}>`
            );
          })
          .exhaustive()
      ),
    )
  ).join("");

const formatAttributes = (
  attributes: Record<string, string | undefined>,
): string =>
  Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join(" ");
