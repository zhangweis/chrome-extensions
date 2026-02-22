import markdownLinkify from "markdown-linkify";

const rxCommonMarkLink = /(\[([^\]]+)])\(([^)]+)\)/g;

export function commonMarkLinkToAnchorTag(md) {
  var anchor = md;
  if (!md.match(rxCommonMarkLink))
    anchor = markdownLinkify(md);
  anchor = anchor.replace(rxCommonMarkLink, '<a href="$3" target="_blank"> $2 </a>');
  return anchor;
}
