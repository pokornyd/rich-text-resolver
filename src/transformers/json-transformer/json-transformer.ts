import { match } from "ts-pattern";

import { DomHtmlNode, DomNode, DomTextNode } from "../../parser/parser-models.js";

export type NodeTransformer<
  TNode extends DomNode,
  TContext,
  TOutput,
> = TNode extends DomHtmlNode ? (node: TNode, children: TOutput[], context?: TContext) => TOutput[]
  : (node: TNode, context?: TContext) => TOutput[];

export type AsyncNodeTransformer<
  TNode extends DomNode,
  TContext,
  TOutput,
> = TNode extends DomHtmlNode ? (node: TNode, children: TOutput[], context?: TContext) => Promise<TOutput[]>
  : (node: TNode, context?: TContext) => Promise<TOutput[]>;

export type NodeToString<TContext = unknown> = (
  node: DomHtmlNode<any>,
  children: string,
  context?: TContext,
) => string;

export type NodeToStringAsync<TContext = unknown> = (
  node: DomHtmlNode<any>,
  children: string,
  context?: TContext,
) => Promise<string>;

/**
 * A collection of node transformation functions for text and tag nodes.
 *
 * @template TOutput - The type of the result produced by transformations.
 * @template TContext - The type of contextual data passed to transformation functions.
 */
export type NodeTransformers<TOutput, TContext = unknown> = {
  /**
   * Transformation function for text nodes.
   */
  text: NodeTransformer<DomTextNode, TContext, TOutput>;
  /**
   * A mapping of tag names to transformation functions for HTML nodes.
   * Use the `"*"` key as a wildcard fallback for all tags not explicitly defined.
   */
  tag: Record<string, NodeTransformer<DomHtmlNode<any>, TContext, TOutput>>;
};

/**
 * A collection of async node transformation functions for text and tag nodes.
 *
 * @template TOutput - The type of the result produced by transformations.
 * @template TContext - The type of contextual data passed to transformation functions.
 */
export type AsyncNodeTransformers<TOutput, TContext = unknown> = {
  /**
   * Async transformation function for text nodes.
   */
  text: AsyncNodeTransformer<DomTextNode, TContext, TOutput>;
  /**
   * A mapping of tag names to async transformation functions for HTML nodes.
   * Use the `"*"` key as a wildcard fallback for all tags not explicitly defined.
   */
  tag: Record<string, AsyncNodeTransformer<DomHtmlNode<any>, TContext, TOutput>>;
};

/**
 * A record of functions that convert an HTML node and its children to a string.
 *
 * @template TContext - The type of contextual data passed to the conversion functions.
 */
export type NodeToStringMap<TContext = unknown> = Record<string, NodeToString<TContext>>;

/**
 * A record of async functions that convert an HTML node and its children to a string.
 *
 * @template TContext - The type of contextual data passed to the conversion functions.
 */
export type AsyncNodeToStringMap<TContext = unknown> = Record<string, NodeToStringAsync<TContext>>;

/**
 * Recursively traverses an array of `DomNode`, transforming each node using a corresponding transformation method from `transformers` parameter.
 * The transformation begins from the deepest nodes and propagates intermediate results upwards through the recursion.
 * You can optionally provide a context object and a handler to update it before a node is processed.
 *
 * @template TContext - The type of the context object used during traversal.
 *
 * @param {DomNode[]} nodes - The array of `DomNode` elements to traverse and transform.
 * @param {NodeTransformers<TContext, TOutput>} transformers - An object defining transformation functions for each text and tag node respectively.
 * A wildcard `*` tag can be used for defining a transformation for all tags for which a custom transformation wasn't specified.
 * @param {TContext} [context={}] - The initial context object passed to the `transform` function and updated by the `contextHandler`. Empty object by default.
 * @param {(node: DomNode, context: TContext) => TContext} [contextHandler] - An optional function that updates the context based on the current node.
 *
 * @returns {TOutput[]} Flattened array of transformed nodes.
 *
 * @remarks
 * - The function traverses and transforms the nodes in a depth-first manner.
 * - If a `contextHandler` is provided, it updates the context before passing it to child nodes traversal.
 */
export const transformNodes = <TOutput, TContext>(
  nodes: DomNode[],
  transformers: NodeTransformers<TOutput, TContext>,
  context: TContext = {} as TContext,
  contextHandler?: (node: DomNode, context: TContext) => TContext,
): TOutput[] =>
  nodes.flatMap(node =>
    match(node)
      .with({ type: "text" }, textNode => transformers.text(textNode))
      .with({ type: "tag" }, tagNode => {
        const updatedContext = contextHandler?.(tagNode, context) ?? context;
        const children = transformNodes(tagNode.children, transformers, updatedContext, contextHandler);
        const transformer = transformers.tag[tagNode.tagName] ?? transformers.tag["*"];
        if (!transformer) {
          throw new Error(`No transformer specified for tag: ${tagNode.tagName}`);
        }

        return transformer(tagNode, children, updatedContext);
      })
      .exhaustive()
  );

/**
 * Recursively traverses an array of `DomNode`, transforming each node using a corresponding transformation method from `transformers` parameter in an asynchronous manner.
 * The transformation begins from the deepest nodes and propagates intermediate results upwards through the recursion.
 * You can optionally provide a context object and a handler to update it before a node is processed.
 *
 * @template TContext - The type of the context object used during traversal.
 *
 * @param {DomNode[]} nodes - The array of `DomNode` elements to traverse and transform.
 * @param {AsyncNodeTransformers<TContext, TOutput>} transformers - An object defining asynchronous transformation functions for each text and tag node respectively.
 * A wildcard `*` tag can be used for defining a transformation for all tags for which a custom transformation wasn't specified.
 * @param {TContext} [context={}] - The initial context object passed to the `transform` function and updated by the `contextHandler`. Empty object by default.
 * @param {(node: DomNode, context: TContext) => TContext} [contextHandler] - An optional function that updates the context based on the current node.
 *
 * @returns {Promise<TOutput[]>} Flattened array of transformed nodes.
 *
 * @remarks
 * - The function traverses and transforms the nodes in a depth-first manner.
 * - If a `contextHandler` is provided, it updates the context before passing it to child nodes traversal.
 */
export const transformNodesAsync = async <TOutput, TContext>(
  nodes: DomNode[],
  transformers: AsyncNodeTransformers<TOutput, TContext>,
  context: TContext = {} as TContext,
  contextHandler?: (node: DomNode, context: TContext) => TContext,
): Promise<TOutput[]> => {
  const results = await Promise.all(
    nodes.map(async (node) =>
      match(node)
        .with({ type: "text" }, textNode => transformers.text(textNode))
        .with({ type: "tag" }, async tagNode => {
          const updatedContext = contextHandler?.(tagNode, context) ?? context;
          const children = await transformNodesAsync(tagNode.children, transformers, updatedContext, contextHandler);
          const transformer = transformers.tag[tagNode.tagName] ?? transformers.tag["*"];
          if (!transformer) {
            throw new Error(`No transformer specified for tag: ${tagNode.tagName}`);
          }

          return await transformer(tagNode, children, updatedContext);
        })
        .exhaustive()
    ),
  );

  return results.flat();
};

/**
 * Recursively traverses an array of `DomNode`, transforming each tag node to its HTML string representation, including all attributes.
 * You can override transformation for individual tags by providing a custom transformer via `transformers` parameter. Text nodes are transformed automatically.
 * An optional context object and a handler to update it before a tag node is processed can be provided.
 *
 * @template TContext - The type of the context object used during traversal.
 *
 * @param {DomNode[]} nodes - The array of `DomNode` elements to traverse and transform.
 * @param {NodeToStringMap<TContext>} transformers - Record of `tag : function` pairs defining transformations for individual tags.
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
export const nodesToHtml = <TContext>(
  nodes: DomNode[],
  transformers: NodeToStringMap<TContext>,
  context: TContext = {} as TContext,
  contextHandler?: (node: DomNode, context: TContext) => TContext,
): string =>
  nodes.map(node =>
    match(node)
      .with({ type: "text" }, textNode => textNode.content)
      .with({ type: "tag" }, tagNode => {
        const updatedContext = contextHandler?.(tagNode, context) ?? context;
        const children = nodesToHtml(tagNode.children, transformers, updatedContext, contextHandler);
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
 * @param {AsyncNodeToStringMap<TContext>} transformers - Record of `tag : function` pairs defining async transformations for individual tags.
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
export const nodesToHtmlAsync = async <TContext>(
  nodes: DomNode[],
  transformers: AsyncNodeToStringMap<TContext>,
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
            const children = await nodesToHtmlAsync(tagNode.children, transformers, updatedContext, contextHandler);
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
  exclude: ReadonlyArray<string> = [],
): string =>
  Object.entries(attributes)
    .filter(([, value]) => !([undefined, ...exclude].includes(value)))
    .map(([key, value]) => ` ${key}="${value}"`)
    .join(" ");
