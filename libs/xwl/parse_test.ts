import { assertEquals } from "@std/assert";
import { parseXwl } from "./parse.ts";

Deno.test(function parseSingleTagTest() {
  assertEquals(parseXwl("<tag>contents</tag>"), {
    tag: "tag",
    args: null,
    contents: ["contents"],
  });
});

Deno.test(function parseSingleTagTest() {
  assertEquals(parseXwl("<tag key1='str' key2=42>contents</tag>"), {
    tag: "tag",
    contents: ["contents"],
    args: new Map([
      ["key1", "str"],
      ["key2", "42"],
    ]),
  });
});

Deno.test(function parseTagInsideTagTest() {
  assertEquals(parseXwl("<tag><tag2>contents</tag2></tag>"), {
    tag: "tag",
    args: null,
    contents: [{
      tag: "tag2",
      args: null,
      contents: ["contents"],
    }],
  });
});

Deno.test(function parseStringAndTagTest() {
  assertEquals(parseXwl("<root>hello<tag>world</tag></root>"), {
    tag: "root",
    args: null,
    contents: [
      "hello",
      {
        tag: "tag",
        args: null,
        contents: ["world"],
      },
    ],
  });
});

Deno.test(function parseTagBetweenStringsTest() {
  assertEquals(parseXwl("<root>\nhello<tag>world</tag>!\n</root>"), {
    tag: "root",
    args: null,
    contents: [
      "hello",
      {
        tag: "tag",
        args: null,
        contents: ["world"],
      },
      "!",
    ],
  });
});

Deno.test(function parseTagBetweenStringsTest() {
  assertEquals(
    parseXwl(
      `<root>
      <header level=1>title</header>
      <header level=2><italic>abstract</italic></header>
      This is <bold>abstract</bold>.
    </root>`,
    ),
    {
      tag: "root",
      args: null,
      contents: [
        {
          tag: "header",
          args: new Map([["level", "1"]]),
          contents: ["title"],
        },
        {
          tag: "header",
          args: new Map([["level", "2"]]),
          contents: [
            {
              tag: "italic",
              args: null,
              contents: ["abstract"],
            },
          ],
        },
        "This is ",
        {
          tag: "bold",
          args: null,
          contents: ["abstract"],
        },
        ".",
      ],
    },
  );
});

Deno.test(function parseTagBetweenStringsTest() {
  assertEquals(
    parseXwl(
      `<root>
      <header level=1>title</header>
      <header level=2><italic>abstract</italic></header>
      This is <bold>abstract</bold>.
    </root>`,
    ),
    {
      tag: "root",
      args: null,
      contents: [
        {
          tag: "header",
          args: new Map([["level", "1"]]),
          contents: ["title"],
        },
        {
          tag: "header",
          args: new Map([["level", "2"]]),
          contents: [
            {
              tag: "italic",
              args: null,
              contents: ["abstract"],
            },
          ],
        },
        "This is ",
        {
          tag: "bold",
          args: null,
          contents: ["abstract"],
        },
        ".",
      ],
    },
  );
});
