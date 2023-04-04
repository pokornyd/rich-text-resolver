import { Elements, ElementType } from '@kontent-ai/delivery-sdk';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { PortableText } from '@portabletext/react';
import { IPortableTextComponent, nodeParse, transform } from '../../src';

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
          workflowStep: "published"
        },
        elements: {
          text_element: {
            type: ElementType.Text,
            name: "text element",
            value: "random text value"
          }
        }
      }
    ],
    links: [],
    name: "dummy"
  };

describe("portable text React resolver", () => {
    it("renders simple HTML", () => {
      const jsonTree = nodeParse(dummyRichText.value);
      const portableText = transform(jsonTree);
      const renderer = TestRenderer.create(<PortableText value={portableText}/>)
    
      let tree = renderer.toJSON();
      expect(tree).toMatchInlineSnapshot(`
<p>
  some text in a paragraph
</p>
`);
    })

    it("renders a resolved item link", () => {
      // const myPortableTextComponents = {
      //   types: {
      //     image: ({value}) => <img src={value.imageUrl} />,
      //     callToAction: ({value, isInline}) =>
      //       isInline ? (
      //         <a href={value.url}>{value.text}</a>
      //       ) : (
      //         <div className="callToAction">{value.text}</div>
      //       ),
      //   },
      
      //   marks: {
      //     link: ({children, value}) => {
      //       const rel = !value.href.startsWith('/') ? 'noreferrer noopener' : undefined
      //       return (
      //         <a href={value.href} rel={rel}>
      //           {children}
      //         </a>
      //       )
      //     },
      //   },
      // }
      
      // const YourComponent = (props) => {
      //   return <PortableText value={props.value} components={myPortableTextComponents} />
      // }
      // expect(tree).toMatchInlineSnapshot();
    })
  })