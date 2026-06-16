import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import cs from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import js from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import ts from "highlight.js/lib/languages/typescript";
import html from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";

const lowlight = createLowlight();

const customLanguages = {
  css,
  javascript: js,
  typescript: ts,
  bash,
  markdown,
  go,
  c,
  php,
  dockerfile,
  yaml,
  html,
  python,
  csharp: cs,
  java,
  cpp,
  sql,
  shell,
  rust,
  powershell,
  json,
};

lowlight.register(customLanguages);

for (const [name, definition] of Object.entries(customLanguages)) {
  hljs.registerLanguage(name, definition);
}

lowlight.registerAlias({
  javascript: ["js", "jsx"],
  typescript: ["ts", "tsx"],
  markdown: ["md"],
  dockerfile: ["docker"],
});

export { lowlight };
