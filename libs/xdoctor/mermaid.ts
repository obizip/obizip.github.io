export async function renderMermaid(content: string) {
  const tmpInputPath = await Deno.makeTempFile({ suffix: ".mmd" });
  const tmpOutputPath = await Deno.makeTempFile({ suffix: ".svg" });

  await Deno.writeTextFile(
    tmpInputPath,
    content,
  );
  const command = new Deno.Command("mmdc", {
    args: ["--quiet", "-i", tmpInputPath, "-o", tmpOutputPath],
  });
  const process = command.spawn();
  const status = await process.status;
  if (!status.success) {
    throw Error("Failed to convert mermaid");
  }

  const svg = await Deno.readTextFile(tmpOutputPath);
  return `<div class="diagram">${svg}</div>`;
}
