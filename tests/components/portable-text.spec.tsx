import { Elements, ElementType } from "@kontent-ai/delivery-sdk";
import { PortableText } from "@portabletext/react";
import { render } from "@testing-library/react";
import React from "react";

import { transformToPortableText } from "../../src";
import { ImageComponent, PortableTextReactResolvers, TableComponent } from "../../src/utils/resolution/react";

const dummyRichText: Elements.RichTextElement = {
  value: "<p>some text in a paragraph</p>",
  type: ElementType.RichText,
  images: [],
  linkedItemCodenames: [],
  linkedItems: [
    {
      system: {
        id: "99e17fe7-a215-400d-813a-dc3608ee0294",
        name: "test item",
        codename: "test_item",
        language: "default",
        type: "test",
        collection: "default",
        sitemapLocations: [],
        lastModified: "2022-10-11T11:27:25.4033512Z",
        workflowStep: "published",
        workflow: "default",
      },
      elements: {
        text_element: {
          type: ElementType.Text,
          name: "text element",
          value: "random text value",
        },
      },
    },
  ],
  links: [],
  name: "dummy",
};

const portableTextComponents: PortableTextReactResolvers = {
  types: {
    componentOrItem: ({ value }) => {
      const item = dummyRichText.linkedItems.find(item => item.system.codename === value.component._ref);
      return <div>{item?.elements.text_element.value}</div>;
    },
    table: ({ value }) => <TableComponent {...value} />,
    image: ({ value }) => <ImageComponent {...value} />,
  },
  marks: {
    link: ({ value, children }) => {
      const target = (value?.href || "").startsWith("http") ? "_blank" : undefined;
      return (
        <a
          href={value?.href}
          target={target}
          rel={value?.rel}
          title={value?.title}
          data-new-window={value?.["data-new-window"]}
        >
          {children}
        </a>
      );
    },
    contentItemLink: ({ value, children }) => {
      const item = dummyRichText.linkedItems.find(item => item.system.id === value?.reference._ref);
      return (
        <a href={"https://somerandomwebsite.xyz/" + item?.system.codename}>
          {children}
        </a>
      );
    },
  },
};

describe("portable text React resolver", () => {
  const renderPortableText = (richTextValue: string, components = portableTextComponents) => {
    dummyRichText.value = richTextValue;
    const portableText = transformToPortableText(dummyRichText.value);

    return render(<PortableText value={portableText} components={components} />).container.innerHTML;
  };

  it("renders simple HTML", () => {
    const tree = renderPortableText("<p>some text in a paragraph</p>");
    expect(tree).toMatchSnapshot();
  });

  it("renders a resolved linked item", () => {
    const tree = renderPortableText(
      "<object type=\"application/kenticocloud\" data-type=\"item\" data-rel=\"link\" data-codename=\"test_item\"></object>",
    );
    expect(tree).toMatchSnapshot();
  });

  it("renders internal and external links", () => {
    const tree = renderPortableText(`
      <p>
        <a href="http://google.com" title="linktitle" target="_blank">external link</a>
        <a data-item-id="99e17fe7-a215-400d-813a-dc3608ee0294" href=""><strong>item link</strong></a>
      </p>
    `);
    expect(tree).toMatchSnapshot();
  });

  it("renders a table", () => {
    const tree = renderPortableText(`
      <table><tbody>
        <tr><td>Ivan</td><td>Jiri</td></tr>
        <tr><td>Ondra</td><td>Dan</td></tr>
      </tbody></table>
    `);
    expect(tree).toMatchSnapshot();
  });

  it("renders an image", () => {
    const tree = renderPortableText(`
      <p>some text before an asset</p>
      <figure data-asset-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" data-image-id="bc6f3ce5-935d-4446-82d4-ce77436dd412">
        <img src="https://assets-us-01.kc-usercontent.com:443/cec32064-07dd-00ff-2101-5bde13c9e30c/7d534724-edb8-4a6d-92f6-feb52be61d37/image1_w_metadata.jpg" data-asset-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" data-image-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" alt="" />
      </figure>
    `);
    expect(tree).toMatchSnapshot();
  });
});
