import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

// 1. 環境の準備
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

// 2. MathJaxの初期化
const tex = new TeX({
  packages: AllPackages,
  macros: {
    bm: ["{\\boldsymbol #1}", 1],
  },
});
const svg = new SVG({ fontCache: "local" });
const html = mathjax.document("", { InputJax: tex, OutputJax: svg });

/**
 * LaTeX文字列をSVG文字列に変換する
 */
export function renderMath(latex: string, display: boolean = true): string {
  const node = html.convert(latex, {
    display,
  });
  return adaptor.innerHTML(node);
}
