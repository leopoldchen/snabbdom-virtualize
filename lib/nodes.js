'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = virtualizeNodes;

var _h = require('snabbdom/h');

var _h2 = _interopRequireDefault(_h);

var _utils = require('./utils');

var _eventListeners = require('./event-listeners');

var _eventListeners2 = _interopRequireDefault(_eventListeners);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function virtualizeNodes(element) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};


    var context = options.context || document;

    if (!element) {
        return null;
    }

    var createdVNodes = [];
    var vnode = convertNode(element, createdVNodes, context);
    options.hooks && options.hooks.create && createdVNodes.forEach(function (node) {
        options.hooks.create(node);
    });
    return vnode;
}

function convertNode(element, createdVNodes, context) {
    // If our node is a text node, then we only want to set the `text` part of
    // the VNode.
    if (element.nodeType === context.defaultView.Node.TEXT_NODE) {
        var _newNode = (0, _utils.createTextVNode)(element.textContent, context);
        _newNode.elm = element;
        createdVNodes.push(_newNode);
        return _newNode;
    }

    // If not a text node, then build up a VNode based on the element's tag
    // name, class and style attributes, and remaining attributes.

    // Special values: style, class. We don't include these in the attrs hash
    // of the VNode.
    var data = {};
    var classes = getClasses(element);
    if (Object.keys(classes).length !== 0) {
        data.class = classes;
    }
    var style = getStyle(element);
    if (Object.keys(style).length !== 0) {
        data.style = style;
    }

    // Build up set of attributes on the element.
    var attributes = element.attributes;
    for (var _i = 0; _i < attributes.length; _i++) {
        var attr = attributes.item(_i);
        var name = attr.name;
        if (name !== 'style' && name !== 'class') {
            if (!data.attrs) {
                data.attrs = {};
            }
            data.attrs[name] = attr.value;
        }
    }

    // Check for event listeners.
    var on = {};
    _eventListeners2.default.forEach(function (key) {
        if (element[key]) {
            on[key.substring(2)] = element[key];
        }
    });
    if (Object.keys(on).length > 0) {
        data.on = on;
    }

    // Build up set of children.
    var childNodes = null;
    var children = element.childNodes;
    if (children.length > 0) {
        childNodes = [];
        for (var i = 0; i < children.length; i++) {
            childNodes.push(convertNode(children.item(i), createdVNodes, context));
        }
    }
    var newNode = (0, _h2.default)(element.tagName.toLowerCase(), data, childNodes);
    newNode.elm = element;
    createdVNodes.push(newNode);
    return newNode;
}

// Builds the class object for the VNode.
function getClasses(element) {
    var className = element.className;
    var classes = {};
    if (className !== null && className.length > 0) {
        className.split(' ').forEach(function (className) {
            if (className.trim().length) {
                classes[className.trim()] = true;
            }
        });
    }
    return classes;
}

// Builds the style object for the VNode.
function getStyle(element) {
    var style = element.style;
    var styles = {};
    for (var i = 0; i < style.length; i++) {
        var name = style.item(i);
        var transformedName = (0, _utils.transformName)(name);
        styles[transformedName] = style.getPropertyValue(name);
    }
    return styles;
}