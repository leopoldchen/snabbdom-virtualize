import htmlparser from 'htmlparser2';
import h from 'snabbdom/h';
import {
    createTextVNode,
    transformName,
    unescapeEntities
} from './utils';

const parseHTML = function (html) {
    let handler = new htmlparser.DomHandler();
    let parser = new htmlparser.Parser(handler, {
        lowerCaseAttributeNames: false
    });
    parser.parseComplete(html);
    return handler.dom;
}

export default function (html, options = {}) {

    const context = options.context || document;

    // If there's nothing here, return null;
    if (!html) {
        return null;
    }

    // Maintain a list of created vnodes so we can call the create hook.
    const createdVNodes = [];

    // Parse the string into the AST and convert to VNodes.
    const vnodes = convertNodes(parseHTML(html), createdVNodes, context);

    let res;
    if (!vnodes) {
        // If there are no vnodes but there is string content, then the string
        // must be just text or at least invalid HTML that we should treat as
        // text (since the AST parser didn't find any well-formed HTML).
        res = toVNode({
            type: 'text',
            content: html
        }, createdVNodes, context);
    } else if (vnodes.length === 1) {
        // If there's only one root node, just return it as opposed to an array.
        res = vnodes[0];
    } else {
        // Otherwise we have an array of VNodes, which we should return.
        res = vnodes;
    }

    // Call the 'create' hook for each created node.
    options.hooks && options.hooks.create && createdVNodes.forEach((node) => {
        options.hooks.create(node);
    });
    return res;
}

function convertNodes(nodes, createdVNodes, context) {
    if (nodes instanceof Array && nodes.length > 0) {
        let convertedNodes = [];
        nodes.forEach((node) => {
            if (node.type !== 'comment') {
                convertedNodes.push(toVNode(node, createdVNodes, context));
            }
        });
        return convertedNodes
    } else {
        return undefined;
    }
}

function toVNode(node, createdVNodes, context) {
    let newNode;
    if (node.type === 'text') {
        newNode = createTextVNode(node.data, context);
    } else {
        newNode = h(node.name, buildVNodeData(node, context), convertNodes(node.children, createdVNodes, context));
    }
    createdVNodes.push(newNode);
    return newNode;
}

function buildVNodeData(node, context) {
    const data = {};
    if (!node.attribs) {
        return data;
    }

    const attrs = Object.keys(node.attribs).reduce((memo, name) => {
        if (name !== 'style' && name !== 'class') {
            const val = unescapeEntities(node.attribs[name], context);
            memo ? memo[name] = val : memo = {
                [name]: val
            };
        }
        return memo;
    }, null);
    if (attrs) {
        data.attrs = attrs;
    }

    const style = parseStyle(node);
    if (style) {
        data.style = style;
    }

    const classes = parseClass(node);
    if (classes) {
        data.class = classes;
    }

    return data;
}

function parseStyle(node) {
    try {
        return node.attribs.style.split(';').reduce((memo, styleProp) => {
            const res = styleProp.split(':');
            const name = transformName(res[0].trim());
            if (name) {
                const val = res[1].replace('!important', '').trim();
                memo ? memo[name] = val : memo = {
                    [name]: val
                };
            }
            return memo;
        }, null);
    } catch (e) {
        return null;
    }
}

function parseClass(node) {
    try {
        return node.attribs.class.split(' ').reduce((memo, className) => {
            className = className.trim();
            if (className) {
                memo ? memo[className] = true : memo = {
                    [className]: true
                };
            }
            return memo;
        }, null);
    } catch (e) {
        return null;
    }
}