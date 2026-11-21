// Everything third-party the app uses, bundled into vendor/vendor.js.
export { EditorState, EditorSelection, StateField, RangeSetBuilder, Compartment } from "@codemirror/state";
export {
  EditorView, keymap, Decoration, ViewPlugin, WidgetType, MatchDecorator,
  drawSelection, highlightActiveLine, placeholder, lineNumbers,
} from "@codemirror/view";
export { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
export { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
export { autocompletion } from "@codemirror/autocomplete";
export { syntaxHighlighting, defaultHighlightStyle, HighlightStyle, indentUnit, StreamLanguage } from "@codemirror/language";
export { markdown, markdownLanguage } from "@codemirror/lang-markdown";
export { tags } from "@lezer/highlight";
export { yamlFrontmatter, yamlLanguage } from "@codemirror/lang-yaml";

// Colours for text files other than notes: each language's parser only, with no completion or linting.
export { jsonLanguage } from "@codemirror/lang-json";
export { javascriptLanguage, typescriptLanguage, jsxLanguage, tsxLanguage } from "@codemirror/lang-javascript";
export { cssLanguage } from "@codemirror/lang-css";
export { htmlLanguage } from "@codemirror/lang-html";
export { xmlLanguage } from "@codemirror/lang-xml";
export { pythonLanguage } from "@codemirror/lang-python";
export { shell } from "@codemirror/legacy-modes/mode/shell";
export { toml } from "@codemirror/legacy-modes/mode/toml";
export { properties } from "@codemirror/legacy-modes/mode/properties";
export { powerShell } from "@codemirror/legacy-modes/mode/powershell";
export { standardSQL } from "@codemirror/legacy-modes/mode/sql";
export { diff } from "@codemirror/legacy-modes/mode/diff";
export { go } from "@codemirror/legacy-modes/mode/go";
export { rust } from "@codemirror/legacy-modes/mode/rust";
export { lua } from "@codemirror/legacy-modes/mode/lua";
export { ruby } from "@codemirror/legacy-modes/mode/ruby";
export { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile";
export { c, cpp, java, csharp, kotlin } from "@codemirror/legacy-modes/mode/clike";
export { MergeView } from "@codemirror/merge";
export { default as MarkdownIt } from "markdown-it";
export { default as DOMPurify } from "dompurify";
export { load as yamlLoad } from "js-yaml";

// Icons (Lucide). Only the ones named here end up in the bundle.
import {
  PanelLeft, Inbox, BookOpen, Pencil, Check, Ellipsis, Plus, RefreshCw, Settings, Search, ChevronRight,
  Folder, FileText, Sheet, Image, X, Trash2, TriangleAlert, Info, Lightbulb, CircleCheck, ClipboardList,
  Quote, Lock, ExternalLink, ArrowLeft, Clock, House, LoaderCircle, Bug, CircleHelp, CircleX, Flame,
  ListChecks, NotebookPen, KeyRound, Rows3, Columns3, FilePlus, History, File, Eye, CloudUpload, ArrowUp,
  Download, FileCode, HardDrive, Link,
} from "lucide";
export const iconNodes = {
  panel: PanelLeft, inbox: Inbox, read: BookOpen, edit: Pencil, check: Check, more: Ellipsis, plus: Plus,
  reload: RefreshCw, settings: Settings, search: Search, chevron: ChevronRight, folder: Folder, file: FileText,
  table: Sheet, image: Image, x: X, trash: Trash2, warning: TriangleAlert, info: Info, tip: Lightbulb,
  success: CircleCheck, abstract: ClipboardList, quote: Quote, lock: Lock, external: ExternalLink, back: ArrowLeft,
  recent: Clock, home: House, spinner: LoaderCircle, bug: Bug, question: CircleHelp, failure: CircleX,
  danger: Flame, todo: ListChecks, note: NotebookPen, key: KeyRound, rows: Rows3, columns: Columns3,
  newNote: FilePlus, history: History, blank: File, eye: Eye, upload: CloudUpload, up: ArrowUp,
  download: Download, code: FileCode, device: HardDrive, link: Link,
};
