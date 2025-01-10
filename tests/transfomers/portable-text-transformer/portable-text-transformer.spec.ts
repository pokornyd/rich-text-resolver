import { nodesToPortableText, PortableTextItem, traversePortableText } from "../../../src";
import { browserParse } from "../../../src/parser/browser";
import { nodeParse } from "../../../src/parser/node";

jest.mock("short-unique-id", () => {
  return jest.fn().mockImplementation(() => {
    return {
      randomUUID: jest.fn().mockReturnValue("guid"),
    };
  });
});

describe("Portable Text Transformer", () => {
  const transformInput = (
    input: string,
  ): {
    nodeResult: PortableTextItem[];
    browserResult: PortableTextItem[];
  } => {
    const browserTree = browserParse(input);
    const nodeTree = nodeParse(input);
    return {
      nodeResult: nodesToPortableText(nodeTree),
      browserResult: nodesToPortableText(browserTree),
    };
  };

  const transformAndCompare = (input: string) => {
    const { nodeResult, browserResult } = transformInput(input);
    expect(nodeResult).toMatchSnapshot();
    expect(nodeResult).toMatchObject(browserResult);
  };

  it("transforms empty rich text", () => {
    transformAndCompare("<p><br></p>");
  });

  it.each([
    `<table><tbody><tr><td>cell content1</td><td>cell 2</td></tr></tbody></table>`,
    `<table>
    <tbody>
       <tr>
          <td><br></td>
          <td>
             <p><a data-item-id="e2d97322-470a-42e7-a31e-40be26c2ef24" href=""><strong>NanoBlade X</strong></a></p>
             <figure data-asset-id="bb79f32d-4fed-4d46-bec3-71b1c285ca30" data-image-id="bb79f32d-4fed-4d46-bec3-71b1c285ca30"><img src="https://qa-preview-assets-eu-01.devkontentmasters.com:443/0a12060e-20af-0124-a95d-871d26379561/2af0a87f-d750-4f6c-b6ff-8f895fa7d235/scalpel_blade_12.jpg" data-asset-id="bb79f32d-4fed-4d46-bec3-71b1c285ca30" data-image-id="bb79f32d-4fed-4d46-bec3-71b1c285ca30" alt=""></figure>
          </td>
          <td>
             <p><a data-item-id="abaf708d-5d91-4b50-9905-30f1d0f482f9" href=""><strong>NanoBlade V</strong></a></p>
             <figure data-asset-id="f6827ddf-7b07-49c3-819d-5270f1ac0164" data-image-id="f6827ddf-7b07-49c3-819d-5270f1ac0164"><img src="https://qa-preview-assets-eu-01.devkontentmasters.com:443/0a12060e-20af-0124-a95d-871d26379561/653b1fc7-466a-4d91-945a-964ae4f9570a/scalpel_blade_11.jpg" data-asset-id="f6827ddf-7b07-49c3-819d-5270f1ac0164" data-image-id="f6827ddf-7b07-49c3-819d-5270f1ac0164" alt=""></figure>
          </td>
       </tr>
       <tr>
          <td>Nano-scale Cutting</td>
          <td>Offers ultra-fine incisions with precision</td>
          <td>Provides precise incisions</td>
       </tr>
       <tr>
          <td>Blade Material</td>
          <td><a data-asset-id="d27a4f12-c51c-4d64-bb8f-6dcd008abb96" href="https://qa-preview-assets-eu-01.devkontentmasters.com:443/0a12060e-20af-0124-a95d-871d26379561/090af31a-6188-4c37-9623-1422fa966d3d/DALL%C2%B7E%202023-06-21%2008.57.55%20-%20GFenerate%20a%20scientific%20showcase%20of%20the%20the%20molecule%20similar%20to%20corabon%20.png">Advanced material</a> for durability</td>
          <td>High-quality material</td>
       </tr>
       <tr>
          <td>Imaging Compatibility</td>
          <td><strong>Seamless integration</strong> with imaging tech</td>
          <td>Limited integration</td>
       </tr>
       <tr>
          <td><a href="https://www.nbstsa.org/cst-certification" title="CST certification">Regulatory Compliance</a></td>
          <td>
             <p>Exceeds regulatory standards</p>
             <ul>
                <li>Basic</li>
                <li>Advanced</li>
                <ul>
                   <li><strong>Advaced II</strong></li>
                </ul>
             </ul>
          </td>
          <td>Meets regulatory standards</td>
       </tr>
    </tbody>
 </table>`,
    `<p>Text</p>
 <p><strong>Bold text</strong></p>
 <p><strong>Bold text </strong><em><strong>with itallic</strong></em><strong> in it</strong></p>
 <p><strong>Overlapping bold </strong><em><strong>over</strong></em><em> itallic text</em></p>
 <ol>
   <li>Odered list</li>
   <li>Ord<strong>ered </strong><strong><sub>li</sub></strong><a href="http://www.example.com"><em><strong><sub>s</sub></strong></em><em>t with s</em>tyles and li</a>nk
     <ol>
       <li>Nested ordered list</li>
       <li>Nested ordered list
         <ol>
           <li>More nested ordered list</li>
           <li><br></li>
         </ol>
       </li>
     </ol>
   </li>
 </ol>
 <h1><br></h1>
 <figure data-asset-id="8c35b61a-8fcb-4089-a576-5a5e7a158bf2" data-image-id="8c35b61a-8fcb-4089-a576-5a5e7a158bf2"><img src="https://example.com/image.png" data-asset-id="8c35b61a-8fcb-4089-a576-5a5e7a158bf2" data-image-id="8c35b61a-8fcb-4089-a576-5a5e7a158bf2" alt=""></figure>
 <h1>Heading</h1>
 <h4>Heading little</h4>
 <table><tbody>
   <tr><td>1</td><td>2 - w<strong>ith bold te</strong>xt</td><td>3 - w<a href="http://www.example.com">ith link ins</a>ide</td></tr>
   <tr><td>4 <em>- w</em><a data-item-id="6538fde0-e6e5-425c-8642-278e637b2dc1" href=""><em>ith lin</em>k to cont</a>ent</td><td><p>5 - with image in <em>table</em></p>
 <figure data-asset-id="8c35b61a-8fcb-4089-a576-5a5e7a158bf2" data-image-id="8c35b61a-8fcb-4089-a576-5a5e7a158bf2"><img src="https://example.com/image.png" data-asset-id="8c35b61a-8fcb-4089-a576-5a5e7a158bf2" data-image-id="8c35b61a-8fcb-4089-a576-5a5e7a158bf2" alt=""></figure>
 <p><em>and style over the i</em>mage</p>
 </td><td><p>6 - with list&nbsp;</p>
 <ul>
   <li>List in table</li>
   <li>Another list item in table
     <ul>
       <li>Nested in table
         <ul>
           <li>More nested in table&nbsp;
             <ol>
               <li>Ordered inside unorederd</li>
               <li>More unordered</li>
             </ol>
           </li>
         </ul>
       </li>
     </ul>
     <ol>
       <li>Returning byck</li>
     </ol>
   </li>
 </ul>
 <ol>
   <li><br></li>
 </ol>
 </td></tr>
   <tr><td>7</td><td>8</td><td>9</td></tr>
 </tbody>
 </table>`,
    `<table><tbody>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
 <tr><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>
</tbody></table>`,
    `<table>
      <tbody>
        <tr>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
        </tr>
        <tr>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
        </tr>
        <tr>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
        </tr>
        <tr>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
        </tr>
        <tr>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
          <td>column</td>
        </tr>
      </tbody>
    </table>`,
  ])("transforms tables with input %s", (input) => {
    transformAndCompare(input);
  });

  it("transforms item links", () => {
    transformAndCompare(
      `<p><a data-item-id="23f71096-fa89-4f59-a3f9-970e970944ec" href="">text<strong>link to an item</strong></a></p>`,
    );
  });

  it("transforms external links", () => {
    transformAndCompare(
      `<h2><strong>Kontent supports portable text!</strong></h2>\n<p>For more information, check out the related <a href="https://github.com/portabletext/portabletext" data-new-window="true" title="Portable text repo" target="_blank" rel="noopener noreferrer"><strong>GitHub repository.</strong></a></p>`,
    );
  });

  it("transforms nested styles", () => {
    transformAndCompare(
      `<p><strong>all text is bold and last part is </strong><em><strong>also italic and this is also </strong></em><em><strong><sup>superscript</sup></strong></em></p>`,
    );
  });

  it("transforms lists", () => {
    transformAndCompare(
      `<ul><li>first level bullet</li><li>first level bullet</li><ol><li>nested number in bullet list</li></ol></ul><ol><li>first level item</li><li>first level item</li><ol><li>second level item</li><li><strong>second level item </strong></li></ol>`,
    );
  });

  it("transforms images", () => {
    transformAndCompare(
      `<figure data-asset-id="7d866175-d3db-4a02-b0eb-891fb06b6ab0" data-image-id="7d866175-d3db-4a02-b0eb-891fb06b6ab0"><img src="https://assets-eu-01.kc-usercontent.com:443/6d864951-9d19-0138-e14d-98ba886a4410/236ecb7f-41e3-40c7-b0db-ea9c2c44003b/sharad-bhat-62p19OGT2qg-unsplash.jpg" data-asset-id="7d866175-d3db-4a02-b0eb-891fb06b6ab0" data-image-id="7d866175-d3db-4a02-b0eb-891fb06b6ab0" alt=""></figure><p><em>text in a paragraph</em></p>`,
    );
  });

  it("transforms complex rich text into portable text", () => {
    transformAndCompare(
      `<table><tbody><tr><td><ul><li>list item</li><ol><li>nested list item</li></ol></ul></td></tr></tbody></table><table><tbody>\n  <tr><td><p>paragraph 1</p><p>paragraph 2</p></td><td><ul>\n  <li>list item\n     </li>\n</ul>\n</td><td><a href="http://google.com" data-new-window="true" title="linktitle" target="_blank" rel="noopener noreferrer">this is a<strong>strong</strong>link</a></td></tr>\n<tr><td><h1><strong>nadpis</strong></h1></td><td><p>text</p></td><td><p>text</p></td></tr>\n<tr><td><em>italic text</em></td><td><p>text</p></td><td><p>text</p></td></tr>\n</tbody></table><p>text<a href="http://google.com" data-new-window="true" title="linktitle" target="_blank" rel="noopener noreferrer">normal and<strong>bold</strong>link</a></p><h1>heading</h1><object type="application/kenticocloud" data-type="item" data-rel="link" data-codename="test_item"></object>`,
    );
  });

  it("doesn't create duplicates for nested spans", () => {
    transformAndCompare(`<p>text<strong>bold</strong></p>`);
  });

  it.each([nodeParse, browserParse])(
    "throws error for non-supported tags for %s",
    (parse) => {
      const input = "<p>text in a paragraph</p><div>text in a div, which doesnt exist in kontent RTE</div>";
      const tree = parse(input);
      expect(() => nodesToPortableText(tree)).toThrow();
    },
  );

  it("doesn't extend link mark to adjacent spans", () => {
    transformAndCompare(
      `<p>The coffee drinking culture has been evolving for hundreds and thousands of years. It has never been <a data-item-id="3120ec15-a4a2-47ec-8ccd-c85ac8ac5ba5" href="">so rich as <strong>today</strong></a>. How do you make sense of different types of coffee, what do the particular names in beverage menus mean and what beverage to choose for which occasion in your favorite café?</p>`,
    );
  });

  it("resolves lists", () => {
    transformAndCompare(
      `<ul>
<li>first    
   <ul>
      <li>second</li>
   </ul>
   <ol>
      <li>second</li>
   </ol>
   <ul>
      <li>
         second        
         <ol>
            <li>third</li>
         </ol>
      </li>
   </ul>
</li>
</ul>`,
    );
  });

  it("resolves adjacent styled fonts in table cell", () => {
    transformAndCompare(
      `<table>
      <tbody>
        <tr>
          <td><strong>bold</strong><em>italic</em></td>
        </tr>
      </tbody>
    </table>`,
    );
  });

  it("extends component block with additional data", () => {
    const input =
      `<object type="application/kenticocloud" data-type="item" data-rel="link" data-codename="test_item"></object>`;

    const processBlock = (block: PortableTextItem) => {
      if (block._type === "componentOrItem") {
        return {
          ...block,
          additionalData: "data",
        };
      }
    };

    const { nodeResult } = transformInput(input);
    const modifiedResult = traversePortableText(nodeResult, processBlock);

    expect(modifiedResult).toMatchSnapshot();
    expect(modifiedResult).toMatchObject(nodeResult);
  });

  it("extends link nested in a table with additional data", () => {
    const input = `<table><tbody><tr><td><a href="http://google.com">tablelink</a></td></tr></tbody></table>`;

    const processBlock = (block: PortableTextItem) => {
      if (block._type === "link") {
        return {
          ...block,
          additionalData: "data",
        };
      }
    };

    const { nodeResult } = transformInput(input);
    const transformedResult = traversePortableText(nodeResult, processBlock);

    expect(transformedResult).toMatchSnapshot();
    expect(transformedResult).toMatchObject(nodeResult);
  });

  it("transforms a linked item and a component from MAPI with corresponding dataType", () => {
    transformAndCompare(
      `<p>Some text at the first level, followed by a component.&nbsp;</p>\n<object type="application/kenticocloud" data-type="component" data-id="d6a10cb4-3639-429f-b6b0-b7fea6dec252"></object>\n<p>and a linked item</p>\n<object type="application/kenticocloud" data-type="item" data-id="99e17fe7-a215-400d-813a-dc3608ee0294"></object>`,
    );
  });

  it("transforms asset from MAPI", () => {
    transformAndCompare(
      `<figure data-asset-id="62ba1f17-13e9-43c0-9530-6b44e38097fc"><img src="#" data-asset-id="62ba1f17-13e9-43c0-9530-6b44e38097fc"></figure>`,
    );
  });

  it("transforms a linked item and a component from DAPI with corresponding dataType", () => {
    transformAndCompare(
      `<p>Some text at the first level, followed by a component.&nbsp;</p>\n<object type="application/kenticocloud" data-type="item" data-rel="component" data-codename="n27ec1626_93ac_0129_64e5_1beeda45416c"></object>\n<p>and a linked item</p>\n<object type="application/kenticocloud" data-type="item" data-rel="link" data-codename="commercet"></object>`,
    );
  });

  it("transforms a link to an asset in DAPI", () => {
    transformAndCompare(
      `<p>Link to an <a data-asset-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" href="https://assets-us-01.kc-usercontent.com:443/cec32064-07dd-00ff-2101-5bde13c9e30c/7d534724-edb8-4a6d-92f6-feb52be61d37/image1_w_metadata.jpg">asset</a></p>`,
    );
  });

  it("transforms a link to an asset in MAPI", () => {
    transformAndCompare(
      `<p>Link to an <a data-asset-id="bc6f3ce5-935d-4446-82d4-ce77436dd412">asset</a></p>`,
    );
  });

  it("with multiple links in a paragraph, doesn't extend linkmark beyond the first", () => {
    transformAndCompare(
      `<p>Text <a href="https://example.com">inner text 1</a> text between <a href="https://example.org">inner text 2</a>.</p>`,
    );
  });

  it("transforms table cell with text and image", () => {
    transformAndCompare(
      "<table><tbody><tr><td><figure data-asset-id=\"521428d2-87fd-4d72-8cff-e4d090a5d109\" data-image-id=\"521428d2-87fd-4d72-8cff-e4d090a5d109\"><img src=\"https://assets-us-01.kc-usercontent.com:443/cec32064-07dd-00ff-2101-5bde13c9e30c/fd9202fe-84f9-43ee-b990-152269df9d75/Screenshot%202022-06-01%20134556.jpg\" data-asset-id=\"521428d2-87fd-4d72-8cff-e4d090a5d109\" data-image-id=\"521428d2-87fd-4d72-8cff-e4d090a5d109\" alt=\"\"></figure>\n<p>c</p></td></tr></tbody></table>",
    );
  });
});
