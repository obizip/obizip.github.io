import { XwlArgs, XwlTag } from "./types.ts";
import * as prettier from "prettier";
import * as katex from "katex";
import { codeToHtml } from "shiki";

function article(contents: string, _args: XwlArgs | null): string {
  return `<article>${contents}</article>`;
}

function title(contents: string, _args: XwlArgs | null): string {
  return `<h1>${contents}</h1>`;
}

function section(contents: string, _args: XwlArgs | null): string {
  return `<h2>${contents}</h2>`;
}

function bold(contents: string, _args: XwlArgs | null): string {
  return `<b>${contents}</b>`;
}

function p(contents: string, _args: XwlArgs | null): string {
  return `<p>${contents}</p>`;
}

function ul(contents: string, _args: XwlArgs | null): string {
  return `<ul>${contents}</ul>`;
}

function ol(contents: string, _args: XwlArgs | null): string {
  return `<ol>${contents}</ol>`;
}

function li(contents: string, _args: XwlArgs | null): string {
  return `<li>${contents}</li>`;
}

function equation(contents: string, _args: XwlArgs | null): string {
  return katex.renderToString(contents, {
    throwOnError: true,
    displayMode: true,
    output: "mathml",
  });
}

function inlineEquation(contents: string, _args: XwlArgs | null): string {
  return katex.renderToString(contents, {
    throwOnError: true,
    displayMode: false,
    output: "mathml",
  });
}

function img(contents: string, args: XwlArgs | null): string {
  const src = args?.get("src");
  if (src) {
    return `<img src="${src}" alt="${contents}"/>`;
  } else {
    throw Error("img needs 'src' parameter");
  }
}

function a(contents: string, args: XwlArgs | null): string {
  const href = args?.get("href");
  if (href) {
    return `<a href="${href}">${contents}</a>`;
  } else {
    throw Error("a needs 'href' parameter");
  }
}

async function code(contents: string, args: XwlArgs | null): Promise<string> {
  let lang = "text";
  let theme = "one-dark-pro";

  const lang_arg = args?.get("lang");
  if (lang_arg) lang = lang_arg;

  const theme_arg = args?.get("theme");
  if (theme_arg) theme = theme_arg;

  const html = await codeToHtml(contents, {
    lang,
    theme,
  });

  return `<div class="code-display">${html}</div>`;
}

async function inlineCode(
  contents: string,
  args: XwlArgs | null,
): Promise<string> {
  let lang = "text";
  let theme = "vitesse-light";

  const lang_arg = args?.get("lang");
  if (lang_arg) lang = lang_arg;

  const theme_arg = args?.get("theme");
  if (theme_arg) theme = theme_arg;

  const html = await codeToHtml(contents, {
    lang,
    theme,
    structure: "inline",
  });

  return `<span class="code-inline">${html}</span>`;
}

function mermaid(contents: string, _args: XwlArgs | null): string {
  return `<pre class="mermaid">${contents}</pre>`;
}

export async function tagToString(tag: XwlTag): Promise<string> {
  //export function tagToString(tag: XWLTag): string {
  let contents = "";
  for (const content of tag.contents) {
    if (typeof content === "string") {
      contents += content;
    } else {
      contents += await tagToString(content);
    }
  }

  switch (tag.tag) {
    case "article":
      return article(contents, tag.args);
    case "title":
      return title(contents, tag.args);
    case "section":
      return section(contents, tag.args);
    case "img":
      return img(contents, tag.args);
    case "b":
      return bold(contents, tag.args);
    case "p":
      return p(contents, tag.args);
    case "ul":
      return ul(contents, tag.args);
    case "ol":
      return ol(contents, tag.args);
    case "li":
      return li(contents, tag.args);
    case "a":
      return a(contents, tag.args);
    case "equation":
    case "eq":
      return equation(contents, tag.args);
    case "inline-equation":
    case "ieq":
      return inlineEquation(contents, tag.args);
    case "code":
    case "c":
      return await code(contents, tag.args);
    case "inline-code":
    case "icode":
    case "ic":
      return await inlineCode(contents, tag.args);
    case "mermaid":
      return mermaid(contents, tag.args);
    default:
      throw Error(`unknown tag: ${tag.tag}`);
  }
}

export function tagToHtml(tag: XwlTag): Promise<string> {
  return tagToString(tag);
}

export async function formatHtml(html: string): Promise<string> {
  const formatted = await prettier.format(html, { parser: "html" });
  return formatted;
}
