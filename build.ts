import vento from "@vento/vento";
import { Environment } from "@vento/vento/src/environment.ts";
import { extractYaml } from "@std/front-matter";
import { parseXwl } from "./libs/xwl/parse.ts";
import { formatHtml, tagToHtml } from "./libs/xwl/to_html.ts";

type PostAttrs = {
  title: string;
  date: string;
  published: boolean;
};

type Post = {
  title: string;
  date: string;
  slug: string;
};

async function outputTemplateAsHtml(
  ventoEnv: Environment,
  templatePath: string,
  outputPath: string,
  args: Record<string, unknown>,
) {
  const html = await ventoEnv.run(templatePath, args);
  Deno.writeTextFile(outputPath, html.content);
}

async function buildPosts(
  ventoEnv: Environment,
  postInputDir: string = "posts",
  postOutputDir: string = "site/posts",
  postTemplatePath: string = "templates/post.vto",
): Promise<Post[]> {
  const posts = [];

  for await (const dirEntry of Deno.readDir(postInputDir)) {
    const postPath = postInputDir + "/" + dirEntry.name;

    // decode post file
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(postPath);
    const postText = decoder.decode(data);

    // read front-matter
    const extracted = extractYaml(postText);
    const postAttrs = extracted.attrs as PostAttrs;

    if (postAttrs.published) {
      const postBody = `<article>${extracted.body}</article>`;

      // parse XWL to HTML
      const postXwl = parseXwl(postBody);
      let postHtml = await tagToHtml(postXwl);
      postHtml = await formatHtml(postHtml);

      // output post
      const outputPostPath = postOutputDir + "/" +
        dirEntry.name.replace(/xwl$/, "html");

      await outputTemplateAsHtml(
        ventoEnv,
        postTemplatePath,
        outputPostPath,
        {
          title: postAttrs.title,
          date: postAttrs.date,
          article: postHtml,
        },
      );

      // push post metadata
      const slug = dirEntry.name.replace(/\.xwl$/, "");
      posts.push({
        title: postAttrs.title,
        date: postAttrs.date,
        slug,
      });
    }
  }
  return posts;
}

async function build() {
  const ventoEnv = vento();

  await outputTemplateAsHtml(
    ventoEnv,
    "templates/index.vto",
    "site/index.html",
    {},
  );

  let posts = await buildPosts(ventoEnv);
  posts = posts.sort(
    (p1, p2) => new Date(p1.date) < new Date(p2.date) ? 1 : -1,
  );
  console.log(posts);

  await outputTemplateAsHtml(
    ventoEnv,
    "templates/posts.index.vto",
    "site/posts/index.html",
    { posts },
  );
}

if (import.meta.main) {
  await build();
}
