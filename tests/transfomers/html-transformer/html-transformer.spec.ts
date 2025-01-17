import {
  AsyncNodeToHtmlMap,
  DomNode,
  nodesToHTML,
  nodesToHTMLAsync,
  NodeToHtmlMap,
  parseHTML,
} from "../../../src/index.js";

describe("nodesToHTML and nodesToHTMLAsync", () => {
  const input = "<p>Hello <b>World</b>!</p><p>Another <i>paragraph</i> with a nested <span>span</span></p>";
  const nodes = parseHTML(input);

  test("should convert nodes to HTML with default resolution (without any transformers, sync)", () => {
    const transformers: NodeToHtmlMap = {};
    const html = nodesToHTML(nodes, transformers);

    expect(html).toEqual(input);
  });

  test("should convert nodes to HTML with default resolution (without any transformes, async)", async () => {
    const transformers: AsyncNodeToHtmlMap = {};
    const html = await nodesToHTMLAsync(nodes, transformers);

    expect(html).toEqual(input);
  });

  test("should convert nodes to HTML with custom and wildcard stringifiers (sync)", () => {
    const transformers: NodeToHtmlMap = {
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

    const html = nodesToHTML(nodes, transformers);

    expect(html).toBe(
      `<p>Hello <b>World</b>!</p><p>Another <em data-custom="yes">paragraph</em> with a nested <span>span</span></p>`,
    );
  });

  test("should remove span tags and keep text content only", () => {
    const transformers: NodeToHtmlMap = {
      span: (_, children) => children,
    };

    const html = nodesToHTML(nodes, transformers);

    expect(html).toBe("<p>Hello <b>World</b>!</p><p>Another <i>paragraph</i> with a nested span</p>");
  });

  test("should convert nodes to HTML with custom transformations in an async manner", async () => {
    const asyncTransformers: AsyncNodeToHtmlMap = {
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

    const resultHtml = await nodesToHTMLAsync(nodes, asyncTransformers);

    expect(resultHtml).toBe(
      `<p>Hello <strong data-async="1">World</strong>!</p><p>Another <i>paragraph</i> with a nested <span>span</span></p>`,
    );
  });

  test("should handle context updates in nodesToHTML", () => {
    const transformers: NodeToHtmlMap<{ color: string }> = {
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

    const html = nodesToHTML(nodes, transformers, initialContext, contextHandler);

    // when span is encountered, context color is changed to blue
    expect(html).toBe(
      `<p style="color:red">Hello <b>World</b>!</p><p style="color:red">Another <i>paragraph</i> with a nested <span style="color:blue">span</span></p>`,
    );
  });
});
