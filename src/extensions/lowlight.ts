import cpp from "highlight.js/lib/languages/cpp";
import cs from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import java from "highlight.js/lib/languages/java";
import js from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import ts from "highlight.js/lib/languages/typescript";
import html from "highlight.js/lib/languages/xml"; // HTML ist in highlight.js unter 'xml'
import { createLowlight } from "lowlight";

const lowlight = createLowlight();

lowlight.register("css", css);
lowlight.register("javascript", js);
lowlight.register("typescript", ts);
lowlight.register("html", html);
lowlight.register("python", python);
lowlight.register("csharp", cs);
lowlight.register("java", java);
lowlight.register("cpp", cpp);
lowlight.register("sql", sql);
lowlight.register("shell", shell);
lowlight.register("rust", rust);
lowlight.register("powershell", powershell);
lowlight.register("json", json);
lowlight.registerAlias("javascript", "js");
lowlight.registerAlias("typescript", "ts");

export { lowlight };
