import { XwlArgs, XwlTag } from "./types.ts";

function parseArgs(raw_args: string): XwlArgs {
  const args: XwlArgs = new Map();
  // args: key1="str" key2=42
  const kvs = raw_args.trim().split(" ").filter((s) => s);
  for (const kv of kvs) {
    const [key, val] = kv.split("=", 2);
    args.set(key, val.trim().replace(/^['"]|['"]$/g, ""));
  }
  return args;
}

function parseXwlTag(matched: RegExpMatchArray): XwlTag {
  let tag_str = matched[1];
  const args_str = matched[2];
  const contents_str = matched[3];

  let args = null;
  if (args_str) {
    args = parseArgs(args_str);
  }

  let contents = null;
  // if a tag starts "!" then do not parse contents
  if (tag_str.charAt(0) === "!") {
    tag_str = tag_str.substring(1);
    console.log(tag_str);
    contents = [contents_str.trim()];
  } else {
    contents = parseXwlInner(contents_str);
  }

  return {
    tag: tag_str,
    args: args,
    contents: contents,
  };
}

function parseXwlInner(input: string): (XwlTag | string)[] {
  const trimed = input.trim();
  let parsed: (XwlTag | string)[] = [];

  const re_open_tag = /<([!a-zA-Z][\w\-]*)([^>]*)>(.*?)<\/\1>/s;

  const matched = trimed.match(re_open_tag);
  if (matched) {
    // parse matched tag
    const tag = parseXwlTag(matched);

    // parse before matched tag
    const index = matched.index ?? 0;
    if (index === 0) {
      parsed = [tag];
    } else {
      parsed = [trimed.slice(0, index), tag];
    }

    // parse after matched tag
    const parsed_len = index + matched[0].length;
    if (parsed_len < trimed.length) {
      const tail = trimed.slice(parsed_len, trimed.length);
      const parsed_tail = parseXwlInner(tail);
      parsed = parsed.concat(parsed_tail);
    }
  } else { // no tag
    parsed = [trimed];
  }

  return parsed;
}

export function parseXwl(input: string): XwlTag {
  const re_open_tag = /^\s*<([a-zA-Z][\w\-]*)([^>]*)>(.*?)<\/\1>\s*$/s;

  const matched = input.match(re_open_tag);
  if (matched) {
    return parseXwlTag(matched);
  }

  throw Error("Failed to parse XWLTag");
}
