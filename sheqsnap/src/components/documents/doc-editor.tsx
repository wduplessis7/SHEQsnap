"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Strikethrough, List, ListOrdered,
  Heading2, Heading3, Minus, Undo, Redo, Code,
} from "lucide-react";

interface DocEditorProps {
  content: string;
  onChange?: (json: string) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
}

export function DocEditor({ content, onChange, editable = true, placeholder, className }: DocEditorProps) {
  let initialContent: any = { type: "doc", content: [] };
  try { initialContent = JSON.parse(content); } catch {}

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: placeholder || "Start writing your document…" }),
      CharacterCount,
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-5",
          "prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
          "prose-p:text-gray-700 prose-li:text-gray-700",
          !editable && "cursor-default"
        ),
      },
    },
  });

  if (!editor) return null;

  const ToolbarBtn = ({
    onClick, active, title, children,
  }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors",
        active ? "bg-[#FFFC41] text-[#1A1A1A]" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden bg-white", className)}>
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-100 bg-gray-50">
          <ToolbarBtn
            title="Undo" onClick={() => editor.chain().focus().undo().run()}
          ><Undo className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn
            title="Redo" onClick={() => editor.chain().focus().redo().run()}
          ><Redo className="h-4 w-4" /></ToolbarBtn>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          <ToolbarBtn
            title="Heading 2"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          ><Heading2 className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn
            title="Heading 3"
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          ><Heading3 className="h-4 w-4" /></ToolbarBtn>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          <ToolbarBtn
            title="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          ><Bold className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn
            title="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          ><Italic className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn
            title="Strikethrough"
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          ><Strikethrough className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn
            title="Code"
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
          ><Code className="h-4 w-4" /></ToolbarBtn>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          <ToolbarBtn
            title="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          ><List className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn
            title="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          ><ListOrdered className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn
            title="Code block"
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          ><Code className="h-4 w-4" /></ToolbarBtn>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          <ToolbarBtn
            title="Horizontal rule"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          ><Minus className="h-4 w-4" /></ToolbarBtn>

          <div className="ml-auto text-xs text-gray-400 pr-1">
            {editor.storage.characterCount?.characters() ?? 0} chars
          </div>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
