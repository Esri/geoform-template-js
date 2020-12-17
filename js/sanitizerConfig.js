/*
  Version 1.6
  6/8/2015
*/

/*global define,document,location,require */
/*jslint sloppy:true,nomen:true,plusplus:true */
/*
 | Copyright 2014 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */

var __spreadArrays =  function () {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++)
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
          r[k] = a[j];
  return r;
};

var allowedSVGTags = [
  "animate",
  "animatetransform",
  "circle",
  "clippath",
  "defs",
  "ellipse",
  "g",
  "image",
  "line",
  "lineargradient",
  "marker",
  "mask",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialgradient",
  "rect",
  "stop",
  "svg",
  "switch",
  "symbol",
  "text",
  "textpath",
  "tspan",
  "use"
];

var additionalAllowedTags = __spreadArrays([
  "dd",
  "dl",
  "dt",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "sub",
  "sup",
], allowedSVGTags);

var allowlistExtension = additionalAllowedTags.reduce(function (allowlist, tag) {
  allowlist[tag] = [];
  return allowlist;
}, {});

var safeAttrs = [
  "align",
  "alink",
  "alt",
  "bgcolor",
  "border",
  "cellpadding",
  "cellspacing",
  "class",
  "color",
  "cols",
  "colspan",
  "coords",
  "dir",
  "face",
  "height",
  "hspace",
  "ismap",
  "lang",
  "marginheight",
  "marginwidth",
  "multiple",
  "nohref",
  "noresize",
  "noshade",
  "nowrap",
  "ref",
  "rel",
  "rev",
  "rows",
  "rowspan",
  "scrolling",
  "shape",
  "span",
  "summary",
  "tabindex",
  "title",
  "usemap",
  "valign",
  "value",
  "vlink",
  "vspace",
  "width"
];

var onTagAttr = function (_tag, attrName, attrValue) {
  var original = attrName + "=\"" + attrValue + "\"";

  if (safeAttrs.includes(attrName)) {
      return original;
  }

  return;
};

define({
  whiteList: allowlistExtension,
  onTagAttr: onTagAttr,
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"]
});
