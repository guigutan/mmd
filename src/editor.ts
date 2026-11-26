import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import {
  StreamLanguage,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";

const mermaidLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match("%%")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match(/"[^"\n]*"|'[^'\n]*'/)) return "string";
    if (stream.match(/(?:--?>?>?|==>|-\.->|<-->|\|\|--o\{|\|\|--\|\{)/))
      return "operator";
    if (
      stream.match(
        /\b(?:flowchart|graph|sequenceDiagram|stateDiagram-v2|erDiagram|classDiagram|gantt|pie|mindmap|timeline|subgraph|end|direction|style|classDef|class|click|participant|actor|autonumber|loop|alt|else|opt|section|title|TD|TB|LR|RL|BT)\b/,
      )
    )
      return "keyword";
    if (stream.match(/#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?\b/)) return "number";
    if (stream.match(/[\[\]{}()|:]/)) return "punctuation";
    stream.next();
    return null;
  },
});

export function createEditor(
  parent: HTMLElement,
  doc: string,
  onChange: (code: string) => void,
) {
  return new EditorView({
    parent,
    doc,
    extensions: [
      basicSetup,
      mermaidLanguage,
      EditorView.lineWrapping,
      syntaxHighlighting(
        HighlightStyle.define([
          { tag: tags.keyword, color: "#7957c3", fontWeight: "600" },
          { tag: tags.comment, color: "#9297a7" },
          { tag: tags.string, color: "#238673" },
          { tag: tags.operator, color: "#6175a6" },
          { tag: tags.number, color: "#b56c36" },
          { tag: tags.punctuation, color: "#747b91" },
        ]),
      ),
      EditorView.theme({
        "&": { height: "100%", fontSize: "14px" },
        "&.cm-focused": { outline: "none" },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily:
            '"Cascadia Code", "SFMono-Regular", Consolas, "Microsoft YaHei", monospace',
          lineHeight: "1.95",
        },
        ".cm-content": { padding: "24px 0", caretColor: "#6558e8" },
        ".cm-line": { padding: "0 16px 0 8px" },
        ".cm-gutters": {
          background: "#fff",
          color: "#b1b5c2",
          border: "none",
          padding: "0 6px 0 10px",
        },
        ".cm-activeLineGutter": { background: "#f3f2ff", color: "#6558e8" },
        ".cm-activeLine": { background: "#f7f7fc" },
        ".cm-cursor": { borderLeftColor: "#6558e8" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
          background: "#e8e4ff",
        },
      }),
      EditorView.contentAttributes.of({
        "aria-label": "Mermaid 代码编辑器",
        spellcheck: "false",
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
    ],
  });
}
