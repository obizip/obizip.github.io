import { assertEquals } from "@std/assert";
import { Parser } from "./parser.ts";

Deno.test(function parseTest() {
  let p = new Parser("<start>");
  assertEquals(p.get_event(), {
    type: "StartTag",
    name: "start",
    attrs: new Map(),
  });

  p = new Parser("<start   >");
  assertEquals(p.get_event(), {
    type: "StartTag",
    name: "start",
    attrs: new Map(),
  });

  p = new Parser("</end  >");
  assertEquals(p.get_event(), {
    type: "EndTag",
    name: "end",
    attrs: new Map(),
  });

  p = new Parser("<empty   />");
  assertEquals(p.get_event(), {
    type: "EmptyElementTag",
    name: "empty",
    attrs: new Map(),
  });

  p = new Parser('<start day="1">');
  assertEquals(p.get_event(), {
    type: "StartTag",
    name: "start",
    attrs: new Map([["day", "1"]]),
  });

  p = new Parser("text");
  assertEquals(p.get_event(), {
    type: "Characters",
    chars: "text",
  });

  p = new Parser('<img src="img_girl.jpg" alt="Girl in a jacket"/>');
  assertEquals(p.get_event(), {
    type: "EmptyElementTag",
    name: "img",
    attrs: new Map([["src", "img_girl.jpg"], ["alt", "Girl in a jacket"]]),
  });

  p = new Parser("<![CDATA[\n<xml>I can write xml like this</xml>\n]]>");
  assertEquals(p.get_event(), {
    type: "CData",
    data: "<xml>I can write xml like this</xml>",
  });

  p = new Parser("<text>\nhello\n</text>");
  const events = p.parse();
  let event = events.next();
  assertEquals(event.done, false);
  assertEquals(event.value, {
    type: "StartTag",
    name: "text",
    attrs: new Map(),
  });
  event = events.next();
  assertEquals(event.done, false);
  assertEquals(event.value, {
    type: "Characters",
    chars: "hello",
  });
  event = events.next();
  assertEquals(event.done, false);
  assertEquals(event.value, {
    type: "EndTag",
    name: "text",
    attrs: new Map(),
  });
  event = events.next();
  assertEquals(event.done, true);
});
