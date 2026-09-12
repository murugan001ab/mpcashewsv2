"use client";
// src/components/admin/RichTextEditor.tsx
//
// A simple, WordPress-style "visual" editor for blog content. The admin is
// not technical, so this hides raw HTML behind a normal toolbar: bold/
// italic/underline, font size, headings, alignment, lists, links, and
// inline images (upload, replace, or delete right inside the text).
//
// Implementation note: this deliberately avoids adding a new npm package
// (no TinyMCE/Quill/etc.) — it's a contentEditable <div> driven by
// document.execCommand, which is all modern browsers still support for
// this exact use case. The underlying value is still plain HTML, so it
// stays compatible with however the post page renders `content`.
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Unlink,
  ImagePlus,
  Undo2,
  Redo2,
  Quote,
  Code2,
  Trash2,
} from "lucide-react";

const FONT_SIZES: { label: string; value: string }[] = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Medium", value: "4" },
  { label: "Large", value: "5" },
  { label: "X-Large", value: "6" },
  { label: "Huge", value: "7" },
];

const BLOCK_TYPES: { label: string; value: string }[] = [
  { label: "Paragraph", value: "p" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
];

function ToolbarButton({
  onClick,
  title,
  active,
  children,
  disabled,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      // mousedown + preventDefault keeps the editor's text selection intact,
      // otherwise clicking a toolbar button collapses the selection first.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-brand-orange/15 text-brand-orange"
          : "text-brand-brown/60 hover:text-brand-black hover:bg-brand-brown/8"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  onUploadImage,
  minHeight = 260,
}: {
  value: string;
  onChange: (html: string) => void;
  /** Upload a file and return a public URL — reuses whatever the page already uses (ImageKit, etc). */
  onUploadImage: (file: File) => Promise<string>;
  minHeight?: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  // Only used to force the toolbar's "active state" (bold/italic/etc.) to refresh.
  const [, forceTick] = useState(0);

  // Load the initial value once. We intentionally don't re-sync on every
  // `value` change from the parent — that would fight the cursor position
  // while typing — so this component owns its own DOM until unmounted.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitChange = useCallback(() => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
    forceTick((n) => n + 1);
  };

  const handleFontSize = (size: string) => {
    if (!size) return;
    exec("fontSize", size);
  };

  const handleBlockType = (tag: string) => {
    exec("formatBlock", tag === "p" ? "p" : tag);
  };

  const handleLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      window.alert("Select some text first, then add a link.");
      return;
    }
    const url = window.prompt("Link URL (e.g. https://example.com)");
    if (!url) return;
    exec("createLink", url);
  };

  const handleImagePick = () => {
    fileInputRef.current?.click();
  };

  const insertImageAtCursor = (url: string) => {
    editorRef.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      `<img src="${url}" alt="" style="max-width:100%;border-radius:12px;" />`
    );
    emitChange();
  };

  const handleFileSelected = async (file: File) => {
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      if (selectedImage) {
        // Replacing an existing image the admin clicked on.
        selectedImage.src = url;
        emitChange();
        setSelectedImage(null);
      } else {
        insertImageAtCursor(url);
      }
    } catch {
      window.alert("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSelectedImage = () => {
    if (!selectedImage) return;
    selectedImage.remove();
    setSelectedImage(null);
    emitChange();
  };

  // Click-to-select images inside the content so the admin can replace or
  // delete them without touching any HTML.
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    editorRef.current
      ?.querySelectorAll("img.rte-selected")
      .forEach((img) => img.classList.remove("rte-selected"));
    if (target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      img.classList.add("rte-selected");
      setSelectedImage(img);
    } else {
      setSelectedImage(null);
    }
  };

  return (
    <div className="rounded-xl border border-brand-brown/15 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange/40 transition">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-brand-brown/10 bg-brand-brown/[0.02]">
        <select
          className="text-xs font-medium text-brand-brown/70 bg-transparent border border-brand-brown/15 rounded-lg px-2 py-1.5 mr-1 focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
          defaultValue="p"
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => handleBlockType(e.target.value)}
          title="Paragraph style"
        >
          {BLOCK_TYPES.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>

        <select
          className="text-xs font-medium text-brand-brown/70 bg-transparent border border-brand-brown/15 rounded-lg px-2 py-1.5 mr-1 focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
          defaultValue=""
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => {
            handleFontSize(e.target.value);
            e.target.value = "";
          }}
          title="Font size"
        >
          <option value="" disabled>
            Font size
          </option>
          {FONT_SIZES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <div className="w-px h-5 bg-brand-brown/10 mx-0.5" />

        <ToolbarButton onClick={() => exec("bold")} title="Bold">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} title="Italic">
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("underline")} title="Underline">
          <Underline size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("strikeThrough")} title="Strikethrough">
          <Strikethrough size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-brand-brown/10 mx-0.5" />

        <ToolbarButton onClick={() => exec("justifyLeft")} title="Align left">
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("justifyCenter")} title="Align center">
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("justifyRight")} title="Align right">
          <AlignRight size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-brand-brown/10 mx-0.5" />

        <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Bullet list">
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} title="Numbered list">
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "blockquote")} title="Quote">
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "pre")} title="Code block">
          <Code2 size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-brand-brown/10 mx-0.5" />

        <ToolbarButton onClick={handleLink} title="Add link">
          <Link2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("unlink")} title="Remove link">
          <Unlink size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-brand-brown/10 mx-0.5" />

        <ToolbarButton onClick={handleImagePick} title={selectedImage ? "Replace selected image" : "Insert image"} disabled={uploading}>
          <ImagePlus size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={handleDeleteSelectedImage}
          title="Delete selected image"
          disabled={!selectedImage}
        >
          <Trash2 size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-brand-brown/10 mx-0.5" />

        <ToolbarButton onClick={() => exec("undo")} title="Undo">
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("redo")} title="Redo">
          <Redo2 size={15} />
        </ToolbarButton>

        {uploading && <span className="text-xs text-brand-brown/45 ml-1">Uploading…</span>}
      </div>

      {selectedImage && (
        <div className="px-3 py-1.5 text-[11px] text-brand-orange bg-brand-orange/5 border-b border-brand-brown/10">
          Image selected — use the image icon to replace it, or the trash icon to delete it.
        </div>
      )}

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onClick={handleEditorClick}
        onKeyUp={() => forceTick((n) => n + 1)}
        onBlur={emitChange}
        style={{ minHeight }}
        className="rte-content px-4 py-3 text-sm text-brand-black outline-none max-w-none [&_img.rte-selected]:ring-2 [&_img.rte-selected]:ring-brand-orange [&_img]:rounded-xl [&_a]:text-brand-orange [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-brand-orange/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-brand-brown/70 [&_pre]:bg-brand-brown/5 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-xs [&_pre]:overflow-x-auto [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
