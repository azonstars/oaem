import DOMPurify from "isomorphic-dompurify";

export const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "span", "div",
  "table", "thead", "tbody", "tr", "th", "td",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "hr",
  "s", "strike", "sub", "sup", "font", "blockquote", "pre", "code",
  "img", "svg", "path", "circle", "rect", "line", "g", "polygon", "polyline"
];

export const ALLOWED_ATTR = [
  "style", "colspan", "rowspan", "align", "valign",
  "width", "height", "border", "cellpadding", "cellspacing",
  "color", "face", "size", "class", "id",
  "src", "alt", "viewBox", "xmlns", "cx", "cy", "r", "d",
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "transform"
];

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "applet"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"],
    ALLOW_DATA_ATTR: false,
  });
}

export default sanitizeHtml;
