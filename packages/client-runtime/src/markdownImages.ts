import {
  normalizeMarkdownLinkDestination,
  splitMarkdownLinkSearchAndHash,
} from "@cadro/shared/markdownLinks";

export { classifyMarkdownImageSource, type MarkdownImageSource } from "@cadro/shared/markdownLinks";

export function markdownImageSourceFragment(source: string): string {
  return splitMarkdownLinkSearchAndHash(normalizeMarkdownLinkDestination(source)).hash;
}
