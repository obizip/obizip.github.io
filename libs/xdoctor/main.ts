import { HTMLConverter } from "./html_converter.ts";

if (import.meta.main) {
  const xml = Deno.readTextFileSync("test.xml");
  const converter = new HTMLConverter(xml);

  let content = "";
  for await (const s of converter.convert()) {
    content += s + "\n";
  }
  const info = converter.state.info;
  console.error(info);

  let html = `<html>\n<body>\n`;
  html += `<h1>${info.title}</h1>\n`;
  html += `<h3>${info.createdAt}</h3>\n`;
  html += `<h3>${info.modifiedAt}</h3>\n`;
  html += "<ul>\n";
  for (const tag of info.tags) {
    html += `<li>${tag}</li>\n`;
  }
  html += "</ul>\n";
  html += `${content}`;
  html += "</body>\n</html>";
  console.log(html);
}
