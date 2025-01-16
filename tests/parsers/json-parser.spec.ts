import { parseHTML } from "../../src";
import { browserParse } from "../../src/parser/browser";
import { nodeParse } from "../../src/parser/node";

describe("node parser", () => {
  it("parses empty rich text", () => {
    const value = `<p><br></p>`;
    const result = parseHTML(value);

    expect(result).toMatchSnapshot();
  });

  it("parses tables", () => {
    const value =
      `<table><tbody>\n  <tr><td><p>paragraph 1</p><p>paragraph 2</p></td><td><p>text</p></td><td><p>text</p></td></tr>\n<tr><td><p>text</p></td><td><p>text</p></td><td><p>text</p></td></tr>\n<tr><td><p>text</p></td><td><p>text</p></td><td><p>text</p></td></tr>\n</tbody></table>`;
    const result = parseHTML(value);

    expect(result).toMatchSnapshot();
  });

  it("parses item links", () => {
    const value =
      `<p><a data-item-id="23f71096-fa89-4f59-a3f9-970e970944ec" href=""><strong>link to an item</strong></a></p>`;
    const result = parseHTML(value);

    expect(result).toMatchSnapshot();
  });

  it("parses external links", () => {
    const value =
      `<p>text<a href="http://google.com" data-new-window="true" title="linktitle" target="_blank" rel="noopener noreferrer">external link</a></p>`;
    const result = parseHTML(value);

    expect(result).toMatchSnapshot();
  });

  it("parses nested styles", () => {
    const value =
      `<p><strong>all text is bold and last part is </strong><em><strong>also italic and this is also </strong></em><em><strong><sup>superscript</sup></strong></em></p>`;
    const result = parseHTML(value);

    expect(result).toMatchSnapshot();
  });

  it("parses lists", () => {
    const value =
      `<ul><li>first level bullet</li><li>first level bullet</li><ol><li>nested number in bullet list</li></ol></ul><ol><li>first level item</li><li>first level item</li><ol><li>second level item</li><li><strong>second level item </strong></li></ol>`;
    const result = parseHTML(value);

    expect(result).toMatchSnapshot();
  });

  it("parses images", () => {
    const value =
      `<figure data-asset-id="7d866175-d3db-4a02-b0eb-891fb06b6ab0" data-image-id="7d866175-d3db-4a02-b0eb-891fb06b6ab0"><img src="https://assets-eu-01.kc-usercontent.com:443/6d864951-9d19-0138-e14d-98ba886a4410/236ecb7f-41e3-40c7-b0db-ea9c2c44003b/sharad-bhat-62p19OGT2qg-unsplash.jpg" data-asset-id="7d866175-d3db-4a02-b0eb-891fb06b6ab0" data-image-id="7d866175-d3db-4a02-b0eb-891fb06b6ab0" alt=""></figure>`;
    const result = parseHTML(value);

    expect(result).toMatchSnapshot();
  });

  it("parses linked items/components", () => {
    const value =
      `<object type="application/kenticocloud" data-type="item" data-rel="link" data-codename="test_item"></object>`;
    const result = parseHTML(value);

    expect(result).toMatchSnapshot();
  });

  it("parses complex rich text into portable text", () => {
    const value =
      `<p><br></p><table><tbody>\n  <tr><td><h1><strong>text</strong></h1>\n<p><br></p>\n</td><td><h1>a</h1>\n<h2>n</h2>\n</td><td><a href="http://google.com">tablelink</a></td></tr>\n  <tr><td><p>asdfg</p>\n<ul>\n  <li>list item\n    <ul>\n      <li>nested list item</li>\n    </ul>\n  </li>\n</ul>\n</td><td><strong>lorem ipsum</strong></td><td>kare</td></tr>\n  <tr><td><figure data-asset-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" data-image-id="bc6f3ce5-935d-4446-82d4-ce77436dd412"><img src="https://assets-us-01.kc-usercontent.com:443/cec32064-07dd-00ff-2101-5bde13c9e30c/7d534724-edb8-4a6d-92f6-feb52be61d37/image1_w_metadata.jpg" data-asset-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" data-image-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" alt=""></figure>\n</td><td>dolor <strong>sit</strong></td><td><br></td></tr>\n</tbody></table><p>text<a href="http://google.com" data-new-window="true" title="linktitle" target="_blank" rel="noopener noreferrer">normal and<strong>bold</strong>link</a></p><h1>heading</h1><object type="application/kenticocloud" data-type="item" data-rel="link" data-codename="test_item"></object>`;
    const result = parseHTML(value);

    expect(result).toMatchSnapshot();
  });

  it("creates identical output as browser parser", () => {
    const value =
      `<p><br></p><table><tbody>\n  <tr><td><h1><strong>text</strong></h1>\n<p><br></p>\n</td><td><h1>a</h1>\n<h2>n</h2>\n</td><td><a href="http://google.com">tablelink</a></td></tr>\n  <tr><td><p>asdfg</p>\n<ul>\n  <li>list item\n    <ul>\n      <li>nested list item</li>\n    </ul>\n  </li>\n</ul>\n</td><td><strong>lorem ipsum</strong></td><td>kare</td></tr>\n  <tr><td><figure data-asset-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" data-image-id="bc6f3ce5-935d-4446-82d4-ce77436dd412"><img src="https://assets-us-01.kc-usercontent.com:443/cec32064-07dd-00ff-2101-5bde13c9e30c/7d534724-edb8-4a6d-92f6-feb52be61d37/image1_w_metadata.jpg" data-asset-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" data-image-id="bc6f3ce5-935d-4446-82d4-ce77436dd412" alt=""></figure>\n</td><td>dolor <strong>sit</strong></td><td><br></td></tr>\n</tbody></table><p>text<a href="http://google.com" data-new-window="true" title="linktitle" target="_blank" rel="noopener noreferrer">normal and<strong>bold</strong>link</a></p><h1>heading</h1><object type="application/kenticocloud" data-type="item" data-rel="link" data-codename="test_item"></object>`;
    const parseResult = nodeParse(value);
    const browserParseResult = browserParse(value);

    expect(parseResult).toEqual(browserParseResult);
  });
});
