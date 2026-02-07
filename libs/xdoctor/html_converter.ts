import {
  Attributes,
  EmptyElementTag,
  EndTag,
  Event,
  Parser,
  StartTag,
} from "./parser.ts";
import { codeToHtml } from "@shikijs/shiki";
import { renderMath } from "./math.ts";
import { renderMermaid } from "./mermaid.ts";
import { assert } from "@std/assert";

export type Info = {
  kind: string; // article ...
  title: string;
  createdAt: string;
  modifiedAt: string;
  tags: string[];
  draft: boolean;
};

const DefaultInfo = {
  kind: "article",
  title: "title",
  createdAt: "2000-01-01",
  modifiedAt: "2000-01-01",
  tags: [],
  draft: false,
};

type State = {
  sectionStack: number[];
  attrsStack: Attributes[];
  captureRequests: string[];
  capturedMap: Map<string, string>;
  content: string;
  inInfo: boolean;
  info: Info;
};

const DefaultState: State = {
  sectionStack: [],
  attrsStack: [],
  captureRequests: [],
  capturedMap: new Map(),
  content: "",
  inInfo: false,
  info: DefaultInfo,
};

type Converter = {
  onStartTag?: (event: StartTag, state: State) => Promise<string> | undefined;
  onEndTag?: (event: EndTag, state: State) => Promise<string> | undefined;
  onEmptyElementTag?: (
    event: EmptyElementTag,
    state: State,
  ) => Promise<string> | undefined;
};

function popCaptured(tagname: string, state: State) {
  const captured = state.capturedMap.get(tagname);
  if (captured) {
    state.capturedMap.delete(tagname);
  }
  const request = state.captureRequests.pop();
  assert(
    request === tagname,
    `incorrect capturing expects: ${tagname}, actual: ${request}`,
  );
  return captured ?? "";
}

function tagnameConverter(input: string, output: string): [string, Converter] {
  return [input, {
    onStartTag: (event, _) => {
      let attrs = "";
      if (event.attrs.size > 0) {
        for (const [k, v] of event.attrs.entries()) {
          attrs += ` ${k}="${v}"`;
        }
      }
      return Promise.resolve(`<${output}${attrs}>`);
    },
    onEndTag: (_) => {
      return Promise.resolve(`</${output}>`);
    },
  }];
}

const ConverterMap: Map<string, Converter> = new Map([
  ["article", {
    onStartTag: (_event, state) => {
      state.info.kind = "article";
      return undefined;
    },
    onEndTag: (_event, _state) => {
      return undefined;
    },
  }],
  ["info", {
    onStartTag: (_event, state) => {
      state.inInfo = true;
      return undefined;
    },
    onEndTag: (_event, state) => {
      state.inInfo = false;
      return undefined;
    },
  }],
  ["section", {
    onStartTag: (_event, state) => {
      const sectionNumber = 2;
      state.sectionStack.push(sectionNumber);
      return undefined;
    },
    onEndTag: (_event, state) => {
      state.sectionStack.pop();
      return undefined;
    },
  }],
  ["subsection", {
    onStartTag: (_event, state) => {
      const sectionNumber = 3;
      state.sectionStack.push(sectionNumber);
      return undefined;
    },
    onEndTag: (_event, state) => {
      state.sectionStack.pop();
      return undefined;
    },
  }],
  ["title", {
    onStartTag: (event, state) => {
      if (state.inInfo) {
        state.captureRequests.push(event.name);
        return undefined;
      } else {
        return Promise.resolve(`<h${state.sectionStack.slice(-1)}>`);
      }
    },
    onEndTag: (event, state) => {
      if (state.inInfo) {
        state.info.title = popCaptured(event.name, state).trim();
        return undefined;
      }
      return Promise.resolve(`</h${state.sectionStack.slice(-1)}>`);
    },
  }],
  ["createdAt", {
    onStartTag: (event, state) => {
      state.captureRequests.push(event.name);
      return undefined;
    },
    onEndTag: (event, state) => {
      state.info.createdAt = popCaptured(event.name, state);
      return undefined;
    },
  }],
  ["modifiedAt", {
    onStartTag: (event, state) => {
      state.captureRequests.push(event.name);
      return undefined;
    },
    onEndTag: (event, state) => {
      state.info.modifiedAt = popCaptured(event.name, state);
      return undefined;
    },
  }],
  // ["tags", NOP],
  ["tag", {
    onStartTag: (event, state) => {
      assert(state.inInfo);
      state.captureRequests.push(event.name);
      return undefined;
    },
    onEndTag: (event, state) => {
      state.info.tags.push(popCaptured(event.name, state));
      return undefined;
    },
  }],
  ["draft", {
    onEmptyElementTag: (_event, state) => {
      assert(state.inInfo);
      state.info.draft = true;
      return undefined;
    },
  }],
  ["eq", {
    onStartTag: (event, state) => {
      state.captureRequests.push(event.name);
      return undefined;
    },
    onEndTag: (event, state) => {
      const captured = popCaptured(event.name, state);
      const eq = renderMath(captured, true);
      const html = `<div class="displayMath">${eq}</div>`;
      return Promise.resolve(html);
    },
  }],
  ["ieq", {
    onStartTag: (event, state) => {
      state.captureRequests.push(event.name);
      return undefined;
    },
    onEndTag: (event, state) => {
      const captured = popCaptured(event.name, state);
      const eq = renderMath(captured, false);
      return Promise.resolve(eq);
    },
  }],
  ["listing", {
    onStartTag: (event, state) => {
      state.captureRequests.push(event.name);
      state.attrsStack.push(event.attrs);
      return undefined;
    },
    onEndTag: async (event, state) => {
      const captured = popCaptured(event.name, state);
      const attrs = state.attrsStack.pop();
      assert(attrs);
      const lang = attrs.get("lang") ?? "text";
      const code = await codeToHtml(captured, {
        lang: lang,
        theme: "dark-plus",
      });
      return code;
    },
  }],
  ["code", {
    onStartTag: (event, state) => {
      state.captureRequests.push(event.name);
      state.attrsStack.push(event.attrs);
      return undefined;
    },
    onEndTag: async (event, state) => {
      const captured = popCaptured(event.name, state);
      const attrs = state.attrsStack.pop();
      assert(attrs);
      const lang = attrs.get("lang") ?? "shellscript";
      const code = await codeToHtml(captured, {
        lang: lang,
        theme: "dark-plus",
        structure: "inline",
      });
      return code;
    },
  }],
  ["diagram", {
    onStartTag: (event, state) => {
      state.captureRequests.push(event.name);
      return undefined;
    },
    onEndTag: async (event, state) => {
      const captured = popCaptured(event.name, state);
      const diagram = await renderMermaid(captured);
      return diagram;
    },
  }],
  ["figure", {
    onStartTag: (event, state) => {
      state.captureRequests.push(event.name);
      state.attrsStack.push(event.attrs);
      return undefined;
    },
    onEndTag: (event, state) => {
      const captured = popCaptured(event.name, state);
      const attrs = state.attrsStack.pop();
      assert(attrs);
      const html = `<img src="${attrs.get("src")}" alt="${captured}" />`;
      return Promise.resolve(html);
    },
  }],
  tagnameConverter("p", "p"),
  tagnameConverter("ol", "ol"),
  tagnameConverter("ul", "ul"),
  tagnameConverter("li", "li"),
  tagnameConverter("em", "em"),
  tagnameConverter("a", "a"),
  tagnameConverter("abbr", "abbr"),
  tagnameConverter("blockquote", "blockquote"),
  tagnameConverter("caption", "caption"),
  tagnameConverter("cite", "cite"),
  tagnameConverter("quote", "q"),
  tagnameConverter("q", "q"),
  tagnameConverter("strong", "strong"),
]);

export class HTMLConverter {
  parser: Parser;
  state: State;

  constructor(xml: string) {
    this.parser = new Parser(xml);
    this.state = DefaultState;
  }

  async convertAll() {
    let content = "";
    for await (const s of this.convert()) {
      content += s + "\n";
    }
    const info = this.state.info;

    return { info, content };
  }

  async *convert() {
    for (const event of this.parser.parse()) {
      const s = await this.convert_event(event);
      // console.log(event);
      if (s) {
        yield s;
      }
    }
  }

  async convert_event(event: Event): Promise<string | undefined> {
    switch (event.type) {
      case "EmptyElementTag": {
        const converter = ConverterMap.get(event.name);
        if (!converter) {
          return undefined;
        }
        const convertFn = converter.onEmptyElementTag;
        if (!convertFn) {
          return undefined;
        }
        return await convertFn(event, this.state);
      }
      case "StartTag": {
        const converter = ConverterMap.get(event.name);
        if (!converter) {
          return undefined;
        }
        const convertFn = converter.onStartTag;
        if (!convertFn) {
          return undefined;
        }
        return await convertFn(event, this.state);
      }
      case "EndTag": {
        const converter = ConverterMap.get(event.name);
        if (!converter) {
          return undefined;
        }
        const convertFn = converter.onEndTag;
        if (!convertFn) {
          return undefined;
        }
        return await convertFn(event, this.state);
      }
      case "Characters": {
        const chars = event.chars;
        if (this.state.captureRequests.length > 0) {
          this.state.captureRequests.forEach((request) => {
            const newContent = this.state.capturedMap.get(request) ??
              "" + chars;
            this.state.capturedMap.set(request, newContent);
          });
          return undefined;
        } else {
          return chars;
        }
      }
      case "CData": {
        const data = event.data;
        if (this.state.captureRequests.length > 0) {
          this.state.captureRequests.forEach((request) => {
            const newContent = this.state.capturedMap.get(request) ?? "" + data;
            this.state.capturedMap.set(request, newContent);
          });
          return undefined;
        } else {
          return data;
        }
      }
    }
  }
}
