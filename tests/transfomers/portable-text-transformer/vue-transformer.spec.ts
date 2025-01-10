import { PortableText, PortableTextComponentProps, PortableTextComponents, toPlainText } from "@portabletext/vue";
import { mount } from "@vue/test-utils";
import { h } from "vue";

import { nodesToPortableText, parseHtml, PortableTextImage, PortableTextTable } from "../../../src";
import { resolveImage, resolveTable } from "../../../src/utils/resolution/vue";

const components: PortableTextComponents = {
  types: {
    image: ({ value }: PortableTextComponentProps<PortableTextImage>) => resolveImage(value, h),
    table: ({ value }: PortableTextComponentProps<PortableTextTable>) => resolveTable(value, h, toPlainText),
  },
};

describe("PortableText Vue Renderer", () => {
  const renderPortableText = (
    richTextValue: string,
    customComponents = components,
  ) => {
    const jsonTree = parseHtml(richTextValue);
    const portableText = nodesToPortableText(jsonTree);

    return mount(PortableText, {
      props: {
        value: portableText,
        components: customComponents,
      },
    });
  };

  it("renders simple HTML from portable text", () => {
    const richTextValue = `<p>some text in a paragraph</p>`;
    const wrapper = renderPortableText(richTextValue);

    expect(wrapper.html()).toMatchSnapshot();
  });

  it("renders an image", () => {
    const richTextValue =
      `<p>some text before an asset</p><figure data-asset-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" data-image-id="bc6f3ce5-935d-4446-82d4-ce77436dd412"><img src="https://assets-us-01.kc-usercontent.com:443/cec32064-07dd-00ff-2101-5bde13c9e30c/7d534724-edb8-4a6d-92f6-feb52be61d37/image1_w_metadata.jpg" data-asset-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" data-image-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" alt="alternative_text"></figure>`;
    const wrapper = renderPortableText(richTextValue);

    expect(wrapper.html()).toMatchSnapshot();
  });

  it("renders a table", () => {
    const richTextValue =
      "<table><tbody>\n  <tr><td>Ivan</td><td>Jiri</td></tr>\n  <tr><td>Ondra</td><td>Dan</td></tr>\n</tbody></table>";
    const wrapper = renderPortableText(richTextValue);

    expect(wrapper.html()).toMatchSnapshot();
  });
});
