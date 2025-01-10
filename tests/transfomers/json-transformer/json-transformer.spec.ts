import {
  AsyncNodeToStringMap,
  AsyncNodeTransformers,
  DomNode,
  nodesToHtml,
  nodesToHtmlAsync,
  NodeToStringMap,
  NodeTransformers,
  parseHtml,
  transformNodes,
  transformNodesAsync,
} from "../../../src";

describe("transformNodes and transformNodesAsync", () => {
  const input = "<p>Hello <b>World</b>!</p><p>Another <i>paragraph</i> with a nested <span>span</span></p>";
  const nodes = parseHtml(input);

  test("should throw if no tag transformer is specified", () => {
    const transformers: NodeTransformers<string> = {
      text: (node) => [`[TEXT:${node.content}]`],
      tag: {},
    };

    expect(() => transformNodes(nodes, transformers)).toThrow();
  });

  test("should transform text and tag nodes with default/wildcard transformer (sync)", () => {
    const transformers: NodeTransformers<string> = {
      text: (node) => [`[TEXT:${node.content}]`],
      tag: {
        span: (
          node,
          children,
        ) => [`[SPAN_OPEN style=${node.attributes?.style}]`, ...children, "[SPAN_CLOSE]"],
        "*": (
          node,
          children,
        ) => [`[TAG:${node.tagName} OPEN]`, ...children, `[TAG:${node.tagName} CLOSE]`],
      },
    };

    const result = transformNodes(nodes, transformers);

    expect(result).toEqual(
      [
        "[TAG:p OPEN]",
        "[TEXT:Hello ]",
        "[TAG:b OPEN]",
        "[TEXT:World]",
        "[TAG:b CLOSE]",
        "[TEXT:!]",
        "[TAG:p CLOSE]",
        "[TAG:p OPEN]",
        "[TEXT:Another ]",
        "[TAG:i OPEN]",
        "[TEXT:paragraph]",
        "[TAG:i CLOSE]",
        "[TEXT: with a nested ]",
        "[SPAN_OPEN style=undefined]",
        "[TEXT:span]",
        "[SPAN_CLOSE]",
        "[TAG:p CLOSE]",
      ],
    );
  });

  test("should transform text and tag nodes with default/wildcard transformer (async)", async () => {
    const transformers: AsyncNodeTransformers<string> = {
      text: async (node) => {
        return Promise.resolve([`[ASYNC_TEXT:${node.content}]`]);
      },
      tag: {
        i: async (_, children) => {
          const prefix = "[ASYNC_I_OPEN]";
          const suffix = "[ASYNC_I_CLOSE]";
          // imitate some async operation
          await new Promise(resolve => setTimeout(resolve, 10));
          return [prefix, ...children, suffix];
        },
        "*": async (node, children) => {
          return Promise.resolve([
            `[ASYNC_TAG:${node.tagName} OPEN]`,
            ...children,
            `[ASYNC_TAG:${node.tagName} CLOSE]`,
          ]);
        },
      },
    };

    const result = await transformNodesAsync(nodes, transformers);

    expect(result).toEqual(
      [
        "[ASYNC_TAG:p OPEN]",
        "[ASYNC_TEXT:Hello ]",
        "[ASYNC_TAG:b OPEN]",
        "[ASYNC_TEXT:World]",
        "[ASYNC_TAG:b CLOSE]",
        "[ASYNC_TEXT:!]",
        "[ASYNC_TAG:p CLOSE]",
        "[ASYNC_TAG:p OPEN]",
        "[ASYNC_TEXT:Another ]",
        "[ASYNC_I_OPEN]",
        "[ASYNC_TEXT:paragraph]",
        "[ASYNC_I_CLOSE]",
        "[ASYNC_TEXT: with a nested ]",
        "[ASYNC_TAG:span OPEN]",
        "[ASYNC_TEXT:span]",
        "[ASYNC_TAG:span CLOSE]",
        "[ASYNC_TAG:p CLOSE]",
      ],
    );
  });

  test("should handle context updates (sync)", () => {
    // Transformers that prepend the current "level" from context
    const transformers: NodeTransformers<string, { level: number }> = {
      text: (node) => [
        `[TEXT:${node.content}]`,
      ],
      tag: {
        div: (_, children, ctx) => {
          return [`[L${ctx?.level ?? 0} DIV_OPEN]`, ...children, "[DIV_CLOSE]"];
        },
        "*": (_, children, ctx) => {
          return [`[L${ctx?.level ?? 0} ANY_OPEN]`, ...children, "[ANY_CLOSE]"];
        },
      },
    };

    const contextHandler = (_: DomNode, context: { level: number }) => {
      return { level: context.level + 1 };
    };

    const initialContext = { level: 0 };

    const result = transformNodes(nodes, transformers, initialContext, contextHandler);

    expect(result).toEqual(
      [
        "[L1 ANY_OPEN]",
        "[TEXT:Hello ]",
        "[L2 ANY_OPEN]",
        "[TEXT:World]",
        "[ANY_CLOSE]",
        "[TEXT:!]",
        "[ANY_CLOSE]",
        "[L1 ANY_OPEN]",
        "[TEXT:Another ]",
        "[L2 ANY_OPEN]",
        "[TEXT:paragraph]",
        "[ANY_CLOSE]",
        "[TEXT: with a nested ]",
        "[L2 ANY_OPEN]",
        "[TEXT:span]",
        "[ANY_CLOSE]",
        "[ANY_CLOSE]",
      ],
    );
  });
});

describe("nodesToHtml and nodesToHtmlAsync", () => {
  const input = "<p>Hello <b>World</b>!</p><p>Another <i>paragraph</i> with a nested <span>span</span></p>";
  const nodes = parseHtml(input);

  test("should convert nodes to HTML with default resolution (without any transformers, sync)", () => {
    const transformers: NodeToStringMap = {};
    const html = nodesToHtml(nodes, transformers);

    expect(html).toEqual(input);
  });

  test("should convert nodes to HTML with default resolution (without any transformes, async)", async () => {
    const transformers: AsyncNodeToStringMap = {};
    const html = await nodesToHtmlAsync(nodes, transformers);

    expect(html).toEqual(input);
  });

  test("should convert nodes to HTML with custom and wildcard stringifiers (sync)", () => {
    const transformers: NodeToStringMap = {
      i: (_, children) => {
        return `<em data-custom="yes">${children}</em>`;
      },
      "*": (node, children) => {
        const attrs = Object.entries(node.attributes || {})
          .map(([k, v]) => ` ${k}="${v}"`)
          .join("");
        return `<${node.tagName}${attrs}>${children}</${node.tagName}>`;
      },
    };

    const html = nodesToHtml(nodes, transformers);

    expect(html).toBe(
      `<p>Hello <b>World</b>!</p><p>Another <em data-custom="yes">paragraph</em> with a nested <span>span</span></p>`,
    );
  });

  test("should remove span tags and keep text content only", () => {
    const transformers: NodeToStringMap = {
      span: (_, children) => children,
    };

    const html = nodesToHtml(nodes, transformers);

    expect(html).toBe("<p>Hello <b>World</b>!</p><p>Another <i>paragraph</i> with a nested span</p>");
  });

  test("should convert nodes to HTML with custom transformations in an async manner", async () => {
    const asyncTransformers: AsyncNodeToStringMap = {
      b: async (_, children) => {
        // simulate some async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return `<strong data-async="1">${children}</strong>`;
      },
      "*": async (node, children) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return `<${node.tagName}>${children}</${node.tagName}>`;
      },
    };

    const resultHtml = await nodesToHtmlAsync(nodes, asyncTransformers);

    expect(resultHtml).toBe(
      `<p>Hello <strong data-async="1">World</strong>!</p><p>Another <i>paragraph</i> with a nested <span>span</span></p>`,
    );
  });

  test("should handle context updates in nodesToHtml", () => {
    const transformers: NodeToStringMap<{ color: string }> = {
      p: (_, children, ctx) => {
        return `<p style="color:${ctx?.color}">${children}</p>`;
      },
      span: (_, children, ctx) => {
        return `<span style="color:${ctx?.color}">${children}</span>`;
      },
      "*": (node, children) => {
        return `<${node.tagName}>${children}</${node.tagName}>`;
      },
    };

    const contextHandler = (node: DomNode, context: { color: string }) => {
      // Suppose we always update color based on node type
      return { color: node.type === "tag" && node.tagName === "span" ? "blue" : context.color };
    };

    const initialContext = { color: "red" };

    const html = nodesToHtml(nodes, transformers, initialContext, contextHandler);

    // when span is encountered, context color is changed to blue
    expect(html).toBe(
      `<p style="color:red">Hello <b>World</b>!</p><p style="color:red">Another <i>paragraph</i> with a nested <span style="color:blue">span</span></p>`,
    );
  });
});
