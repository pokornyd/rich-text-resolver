import { PortableTextComponentOrItem, PortableTextImage, PortableTextItemLink, PortableTextTable } from "../src/index.js"
  
  const portableTextComponent: PortableTextComponentOrItem = {
    _type: "componentOrItem",
    _key: "guid",
    component: {
      _type: "reference",
      _ref: "linkedItemOrComponentCodename",
      referenceType: "codename",
    },
    dataType: "component"
  };
  
  const portableTextImage: PortableTextImage = {
    _type: "image",
    _key: "guid",
    asset: {
      _type: "reference",
      _ref: "bc6f3ce5-935d-4446-82d4-ce77436dd412",
      url: "https://assets-us-01.kc-usercontent.com:443/.../image.jpg",
      alt: "",
      referenceType: "id",
    }
  };
  
  const portableTextItemLink: PortableTextItemLink = {
    _type: "contentItemLink",
    _key: "guid",
    reference: {
      _type: "reference",
      _ref: "0184a8ac-9781-4292-9e30-1fb56f648a6c",
      referenceType: "id",
    }
  };
  
  const portableTextTable: PortableTextTable = {
    _type: "table",
    _key: "guid",
    rows: [
      {
        _type: "row",
        _key: "guid",
        cells: [
          {
            _type: "cell",
            _key: "guid",
            content: [
              {
                _type: "block",
                _key: "guid",
                markDefs: [],
                style: "normal",
                children: [
                  {
                    _type: "span",
                    _key: "guid",
                    marks: [],
                    text: "cell text content",
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };
  