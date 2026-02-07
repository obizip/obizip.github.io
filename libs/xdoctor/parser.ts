function is_space_or_tab(c: string): boolean {
  const code = c.charCodeAt(0);
  return code === 0x0009 || code === 0x0020;
}

function is_ident_char(c: string): boolean {
  return /^[a-zA-Z]$/.test(c);
}

function trim_indent(s: string): string {
  let trimed = "";
  let is_indent = false;
  for (const c of s) {
    if (c === "\n") {
      if (!is_indent) {
        trimed += c;
        is_indent = true;
      }
    } else if (is_space_or_tab(c)) {
      if (!is_indent) {
        trimed += c;
      }
    } else {
      is_indent = false;
      trimed += c;
    }
  }
  return trimed;
}

export type Attributes = Map<string, string>;

export type StartTag = {
  type: "StartTag";
  name: string;
  attrs: Attributes;
};

export type EndTag = {
  type: "EndTag";
  name: string;
  attrs: Attributes;
};

export type EmptyElementTag = {
  type: "EmptyElementTag";
  name: string;
  attrs: Attributes;
};

export type Characters = {
  type: "Characters";
  chars: string;
};

export type CData = {
  type: "CData";
  data: string;
};

export type Comment = {
  type: "Comment";
  comment: string;
};

export type Event =
  | StartTag
  | EndTag
  | EmptyElementTag
  | Characters
  | CData
  | Comment;

export class Parser {
  s: string;
  trim_indent: boolean;
  pos: number;
  row: number;
  col: number;

  constructor(s: string, trim_indent: boolean = true) {
    this.s = s;
    this.trim_indent = trim_indent;

    this.pos = 0;

    this.col = 1;
    this.row = 1;
  }

  *parse() {
    while (this.pos < this.s.length) {
      const event = this.get_event();
      if (event !== null) {
        yield event;
      }
    }
  }

  get_event(): Event | null {
    this.s = this.s.trim();

    // parse comment
    if (this.consume("<!--")) {
      const comment = this.consume_until("-->");
      this.consume("-->");
      return {
        type: "Comment",
        comment: comment,
      };
    }

    // parse CDATA
    if (this.consume("<![CDATA[")) {
      let data = this.consume_until("]]>");
      this.consume("]]>");
      if (data.at(0) == "\n") {
        data = data.slice(1);
      }
      if (data.at(-1) == "\n") {
        data = data.slice(0, -1);
      }
      return {
        type: "CData",
        data: data,
      };
    }

    // parse end-tag
    if (this.consume("</")) {
      this.skip_space_or_tab();
      const name = this.consume_name();
      if (name === null) {
        throw new Error("failed to parse name of tag");
      }
      this.skip_space_or_tab();
      const attrs = this.consume_attributes();
      this.skip_space_or_tab();

      if (this.consume(">")) {
        return {
          type: "EndTag",
          name: name,
          attrs: attrs,
        };
      }

      throw new Error("failed to parse end-tag");
    }

    // parse start-tag or empty-element tag
    if (this.consume("<")) {
      this.skip_space_or_tab();
      const name = this.consume_name();
      if (name === null) {
        throw new Error("failed to parse name of tag");
      }
      this.skip_space_or_tab();
      const attrs = this.consume_attributes();
      this.skip_space_or_tab();

      if (this.consume("/>")) {
        return {
          type: "EmptyElementTag",
          name: name,
          attrs: attrs,
        };
      }

      if (this.consume(">")) {
        return {
          type: "StartTag",
          name: name,
          attrs: attrs,
        };
      }

      throw new Error(
        `failed to parse start-tag or empty-element tag: (${this.row}, ${this.col})`,
      );
    }

    // parse characters
    let chars = this.consume_until("<", true).trim();
    if (this.trim_indent) {
      chars = trim_indent(chars);
    }
    if (chars.length === 0) {
      return null;
    }
    return {
      type: "Characters",
      chars: chars,
    };
  }

  getc(): string {
    if (this.pos >= this.s.length) {
      throw new Error("input string index out of range");
    }
    return this.s[this.pos];
  }

  increment(): void {
    if (this.getc() === "\n") {
      this.row += 1;
      this.col = 0;
    }
    this.col += 1;
    this.pos += 1;
  }

  consume(sub: string): boolean {
    let is_same = true;
    for (let i = 0; i < sub.length; i++) {
      if (this.s[this.pos + i] !== sub[i]) {
        is_same = false;
        break;
      }
    }
    if (is_same) {
      for (let i = 0; i < sub.length; i++) {
        this.increment();
      }
    }
    return is_same;
  }

  consume_until(sub: string, stop_eof: boolean = false): string {
    let consumed = "";

    let is_same = false;
    while (!is_same) {
      is_same = true;

      // check end of file
      if (stop_eof && this.pos + sub.length - 1 >= this.s.length) {
        for (let i = 0; i < sub.length - 1; i++) {
          consumed += this.getc();
          this.increment();
        }
        break;
      }

      for (let i = 0; i < sub.length; i++) {
        if (this.s[this.pos + i] !== sub[i]) {
          is_same = false;
          break;
        }
      }

      if (!is_same) {
        consumed += this.getc();
        this.increment();
      }
    }
    return consumed;
  }

  consume_name(): string | null {
    let name = "";
    if (!/[a-zA-Z]/.test(this.getc())) {
      return null;
    }
    while (is_ident_char(this.getc())) {
      name += this.getc();
      this.increment();
    }
    return name;
  }

  consume_string(): string | null {
    if (!this.consume('"')) {
      return null;
    }
    const str = this.consume_until('"');
    this.consume('"');
    return str;
  }

  consume_attributes(): Attributes {
    const attributes: Attributes = new Map();
    while (true) {
      const key = this.consume_name();
      if (key === null) {
        break;
      }
      if (!this.consume("=")) {
        break;
      }
      const val = this.consume_string();
      if (val === null) {
        break;
      }
      attributes.set(key, val);
      this.skip_space_or_tab();
    }
    return attributes;
  }

  skip_space_or_tab(): void {
    while (is_space_or_tab(this.getc())) {
      this.increment();
    }
  }
}
