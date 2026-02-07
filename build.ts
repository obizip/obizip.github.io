import vento from "@vento/vento";
import { Environment } from "@vento/vento/src/environment.ts";
import { HTMLConverter } from "./libs/xdoctor/html_converter.ts";

type Post = {
  title: string;
  createdAt: string;
  modifiedAt: string;
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

    console.log(postPath);

    // decode post file
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(postPath);
    const postText = decoder.decode(data);

    const converter = new HTMLConverter(postText);

    const { info, content } = await converter.convertAll();

    if (!info.draft) {
      // output post
      const outputPostPath = postOutputDir + "/" +
        dirEntry.name.replace(/xwl$/, "html");

      await outputTemplateAsHtml(
        ventoEnv,
        postTemplatePath,
        outputPostPath,
        {
          title: info.title,
          createdAt: info.createdAt,
          article: `<article>${content}</article>`,
        },
      );

      // push post metadata
      const slug = dirEntry.name.replace(/\.xwl$/, "");
      posts.push({
        title: info.title,
        createdAt: info.createdAt,
        modifiedAt: info.modifiedAt,
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
    (p1, p2) => new Date(p1.createdAt) < new Date(p2.createdAt) ? 1 : -1,
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
