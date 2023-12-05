import { 
    PortableTextListItemType, 
    PortableTextBlock, 
} from '@portabletext/types';
import {
    PortableTextLink,
    PortableTextObject,
    PortableTextStrictBlock,
    PortableTextTable,
    PortableTextTableRow,
    Reference,
} from "../../transformers/index.js"
import {
    IDomHtmlNode,
    IDomNode,
    IOutputResult,
} from "../../parser/index.js"
import {
    compose,
    createBlock,
    createComponentBlock,
    createExternalLink,
    createImageBlock,
    createItemLink,
    createLinkMark,
    createListBlock,
    createSpan,
    createTable,
    createTableCell,
    createTableRow,
    createStyleMark,
    isElement,
    isExternalLink,
    isListBlock,
    isListItem,
    isText,
    isUnorderedListBlock,
    textStyleElements,
    blockElements,
    ignoredElements,
    MergePortableTextItemsFunction,
    TransformElementFunction,
    TransformLinkFunction,
    TransformListItemFunction,
    TransformTextFunction,
    lineBreakElement,
    uid,
    TextStyleElement,
    markElements,
    MarkElement,
    ValidElement,
    BlockElement,
    IgnoredElement,
    TransformFunction
} from "../../utils/index.js"

/**
 * Transforms a parsed tree into an array of Portable Text Blocks.
 *
 * This function takes the parsed tree of a rich text content, flattens it to an array of intermediate
 * Portable Text Objects, and then composes and merges these objects into an array of Portable Text Blocks.
 *
 * @param {IOutputResult} parsedTree - The parsed tree structure representing the rich text content.
 * @returns {PortableTextBlock[]} An array of Portable Text Blocks representing the structured content.
 */
export const transformToPortableText = (parsedTree: IOutputResult): PortableTextBlock[] => {
    const flattened = flatten(parsedTree.children);
    return composeAndMerge(flattened) as PortableTextBlock[];
}

/**
 * Processes and attaches a link type (internal or external) to the most recent text block, or creates a new block if necessary.
 * 
 * This function iterates through the array of PortableTextObjects to find the last text block. If found, it adds the link item 
 * to the mark definitions of the block. If no text block is found (which can happen in structures like tables), a new text 
 * block is created with the link item.
 *
 * @param {PortableTextObject[]} mergedItems - The array of PortableTextObjects being processed.
 * @param {PortableTextLink} linkItem - The link item (either internal or external) to be added to the text block's mark definitions.
 */
const handleLinks = (mergedItems: PortableTextObject[], linkItem: PortableTextLink) => {
    const lastBlockIndex = mergedItems.findLastIndex(item => item._type === 'block');
    if (lastBlockIndex !== -1) {
        const lastBlock = mergedItems[lastBlockIndex] as PortableTextBlock;
        lastBlock.markDefs = lastBlock.markDefs || [];
        lastBlock.markDefs.push(linkItem);
    } else {
        const newBlock = createBlock(uid().toString());
        newBlock.markDefs = [linkItem];
        mergedItems.push(newBlock);
    }
}

/**
 * Merges spans and marks into an array of PortableTextObjects.
 * 
 * This function processes an array of PortableTextObjects and merges span elements with their corresponding 
 * style marks (e.g., 'strong', 'em') and link marks. It handles the scenarios where links may contain multiple 
 * child nodes, some of which may be styled text, ensuring that marks are correctly associated with their respective spans.
 *
 * @param {PortableTextObject[]} itemsToMerge - The array of PortableTextObjects to be merged.
 * @returns {PortableTextObject[]} The array of PortableTextObjects after merging spans and marks.
 */
const mergeSpansAndMarks: MergePortableTextItemsFunction = (itemsToMerge) => {
    let marks: string[] = [];
    let links: string[] = [];
    let linkChildCount = 0;

    const mergedItems = itemsToMerge.reduce<PortableTextObject[]>((mergedItems, item) => {
        switch (item._type) {
            case 'internalLink':
            case 'link':
                handleLinks(mergedItems, item);
                break;
            case 'mark':
                marks.push(item.value);
                break;
            case 'linkMark':
                links.push(item.value);
                linkChildCount = item.childCount;
                break;
            case 'span':
                /**
                 * both styles (strong, em, etc.) and links are represented as "marks" in portable text.
                 * the logic below handles the following situation (note the duplication of <strong> tag pairs):
                 * 
                 * <p><strong>bold text </strong><a href=""><strong>bold text link</strong> regular text link</a> regular text</p>
                 * 
                 * in this case, a link can have multiple child nodes if some of its text is styled. 
                 * as a result, keeping a counter for the link's children and decrementing it with each subsequent span occurrence
                 * is required so that the link mark doesn't extend beyond its scope. 
                 */
                item.marks = [...marks, ...(linkChildCount > 0 ? links : [])];
                // ensures the child count doesn't go below zero
                linkChildCount = Math.max(0, linkChildCount - 1);
                mergedItems.push(item);
                marks = [];
                break;
            default:
                links = [];
                mergedItems.push(item);
                break;
        }
        return mergedItems;
    }, []);

    return mergedItems;
};

const mergeBlocksAndSpans: MergePortableTextItemsFunction = (itemsToMerge) => {
    const mergedItems = itemsToMerge.reduce<PortableTextObject[]>((mergedItems, item) => {
        if (item._type === 'span') {
            const previousBlock = mergedItems.pop() as PortableTextStrictBlock;
            previousBlock.children.push(item);
            mergedItems.push(previousBlock);
        } else {
            mergedItems.push(item);
        }

        return mergedItems;
    }, [])

    return mergedItems;
}

const mergeTablesAndRows: MergePortableTextItemsFunction = (itemsToMerge) => {
    const mergedItems = itemsToMerge.reduce<PortableTextObject[]>((mergedItems, item) => {
        if (item._type === 'row') {
            const tableBlock = mergedItems.pop() as PortableTextTable;
            tableBlock.rows.push(item);
            mergedItems.push(tableBlock);
        } else {
            mergedItems.push(item);
        }

        return mergedItems;
    }, [])

    return mergedItems;
}

const mergeRowsAndCells: MergePortableTextItemsFunction = (itemsToMerge) => {
    const mergedItems = itemsToMerge.reduce<PortableTextObject[]>((mergedItems, item) => {
        if (item._type === 'cell') {
            const tableRow = mergedItems.pop() as PortableTextTableRow;
            tableRow.cells.push(item);
            mergedItems.push(tableRow);
        } else {
            mergedItems.push(item);
        }

        return mergedItems;
    }, [])

    return mergedItems;
}

const composeAndMerge = compose(mergeTablesAndRows, mergeRowsAndCells, mergeBlocksAndSpans, mergeSpansAndMarks);

/**
 * Flattens a tree of IDomNodes into an array of PortableTextObjects.
 * 
 * This function recursively processes a tree structure, transforming each node to its corresponding 
 * PortableTextObject, picking a suitable method using `transformNode`. The resulting array is flat, to be
 * processed with subsequent merge methods.
 * 
 * @param {IDomNode[]} nodes - The array of IDomNodes to be flattened.
 * @param {number} [depth=0] - The current depth in the tree, used for list items.
 * @param {IDomHtmlNode} [lastListElement] - The last processed list element, used for tracking nested lists.
 * @param {PortableTextListItemType} [listType] - The type of the current list being processed (bullet or number).
 * @returns {PortableTextObject[]} The flattened array of PortableTextObjects.
 */
const flatten = (nodes: IDomNode[], depth = 0, lastListElement?: IDomHtmlNode, listType?: PortableTextListItemType): PortableTextObject[] => {
    return nodes.flatMap((node: IDomNode): PortableTextObject[] => {
        let currentListType = listType;

        if (isElement(node)) {
            if (node.tagName === 'td') {
                // table cells are resolved recursively in transformTableCell
                return transformTableCell(node);
            }

            if (isListBlock(node)) {
                // if a list block is found, set a corresponding list type and lastListElement
                lastListElement = node;
                currentListType = isUnorderedListBlock(node) ? 'bullet' : 'number';
            } 
            
            if (isListItem(node)) {
                // set depth to 1 for the first list item encountered and increment for each nested list found
                if (lastListElement && isListBlock(lastListElement)) {
                    depth++;
                }
                // ensures depth remains the same until a nested listBlock is found
                lastListElement = undefined;
            }

            // Recursively flatten children and concatenate with the transformed node.
            const transformedNode = transformNode(node, depth, currentListType);
            const transformedChildren = flatten(node.children, depth, lastListElement, currentListType);
            return [...transformedNode, ...transformedChildren];
        }

        // If not an element, transform as text and return as array
        return [transformText(node)]
    });
};

const transformNode = (node: IDomNode, depth: number, listType?: PortableTextListItemType): PortableTextObject[] => {
    if (isText(node)) {
        return [transformText(node)];
    } else {
        return transformElement(node, depth, listType);
    }
}

const transformElement = (node: IDomHtmlNode, depth: number, listType?: PortableTextListItemType): PortableTextObject[] => {
    const transformerFunction = transformMap[node.tagName as ValidElement];
    // TODO: handle no function found
    return transformerFunction(node, depth, listType!);
}

const transformImage: TransformElementFunction = (node) => {
    const block = createImageBlock(uid().toString());
    const imageTag = node.children[0] as IDomHtmlNode;

    block.asset._ref = node.attributes['data-image-id'];
    block.asset.url = imageTag.attributes['src'];

    return [block];
}

const transformTableCell: TransformElementFunction = (node) => {
    const cellContent = flatten(node.children);
    const isFirstChildText = (
        node.children[0]?.type === 'text' ||
        [lineBreakElement, ...markElements].includes(node.children[0]?.tagName as (MarkElement | 'br'))
    );
    
    /**
     * cell content may not start with <p> but can be directly text, 
     * styled text (e.g. <strong>), anchor or a line break. 
     * in such cases, a block has to be created manually first.
     */
    if(isFirstChildText)
        cellContent.unshift(createBlock(uid().toString()));

    const mergedCellContent = composeAndMerge(cellContent);
    const tableCell = createTableCell(uid().toString(), mergedCellContent.length);
    tableCell.content = mergedCellContent as PortableTextBlock[];

    return [tableCell];
};

const transformItem: TransformElementFunction = (node) => {
    const itemReference: Reference = {
        _type: 'reference',
        _ref: node.attributes['data-codename']
    }

    return [createComponentBlock(uid().toString(), itemReference)];
}

const transformLink: TransformLinkFunction = (node) => {
    if (isExternalLink(node)) {
        return transformExternalLink(node);
    } else {
        return transformInternalLink(node);
    }
}

const transformInternalLink: TransformLinkFunction = (node) => {
    const link = createItemLink(uid().toString(), node.attributes['data-item-id']);
    const mark = createLinkMark(uid().toString(), link._key, node.children.length);

    return [link, mark];
}

const transformExternalLink: TransformLinkFunction = (node) => {
    const link = createExternalLink(uid().toString(), node.attributes)
    const mark = createLinkMark(uid().toString(), link._key, node.children.length);

    return [link, mark];
}

const transformTable: TransformElementFunction = (node) => {
    const tableBody = node.children[0] as IDomHtmlNode;
    const tableRow = tableBody.children[0] as IDomHtmlNode;
    const numCols = tableRow.children.length;

    return [createTable(uid().toString(), numCols)];
}

const transformTableRow: TransformElementFunction = (): PortableTextTableRow[] =>
    [createTableRow(uid().toString())];

const transformText: TransformTextFunction = (node) =>
    createSpan(uid().toString(), [], node.content);

const transformBlock: TransformElementFunction = (node) =>
    [createBlock(uid().toString(), undefined, node.tagName === 'p' ? 'normal' : node.tagName)];

const transformTextMark: TransformElementFunction = (node) =>
    [createStyleMark(uid().toString(), node.tagName)];

const transformLineBreak: TransformElementFunction = () =>
    [createSpan(uid().toString(), [], '\n')];

const transformListItem: TransformListItemFunction = (_, depth, listType) =>
    [createListBlock(uid().toString(), depth, listType!)];

const ignoreElement: TransformElementFunction = () => [];

const transformMap: Record<ValidElement, TransformFunction> = {
    ...Object.fromEntries(
        blockElements.map(tagName => [tagName, transformBlock])
    ) as Record<BlockElement, TransformFunction>,
    ...Object.fromEntries(
        textStyleElements.map(tagName => [tagName, transformTextMark])
    )as Record<TextStyleElement, TransformFunction>,
    ...Object.fromEntries(
        ignoredElements.map(tagName => [tagName, ignoreElement])
    )as Record<IgnoredElement, TransformFunction>,
    'a': transformLink,
    'li': transformListItem,
    'table': transformTable,
    'tr': transformTableRow,
    'td': transformTableCell,
    'br': transformLineBreak,
    'figure': transformImage,
    'object': transformItem,
};

