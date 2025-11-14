import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { translationService } from '../services/translationService';
import { Sparkles } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

const TipTapEditor = ({ content, onChange, placeholder = 'Start typing...' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (editor && text) {
        editor.commands.insertContent(text);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      alert('Please paste using Ctrl+V (Cmd+V on Mac)');
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 border-b-0 rounded-t-md bg-gray-50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive('bold')
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive('italic')
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive('strike')
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <div className="w-px h-6 bg-gray-300"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Heading 3"
        >
          H3
        </button>
        <div className="w-px h-6 bg-gray-300"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive('bulletList')
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive('orderedList')
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Numbered List"
        >
          1.
        </button>
        <div className="w-px h-6 bg-gray-300"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive('paragraph')
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Paragraph"
        >
          P
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive('blockquote')
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Quote"
        >
          "
        </button>
        <div className="w-px h-6 bg-gray-300"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="px-3 py-1 text-sm rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          title="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="px-3 py-1 text-sm rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          title="Redo"
        >
          ↷
        </button>
        <div className="flex-1"></div>
        <button
          type="button"
          onClick={handlePasteFromClipboard}
          className="px-3 py-1 text-sm rounded bg-white text-gray-700 hover:bg-gray-100"
          title="Paste from Clipboard"
        >
          📋 Paste
        </button>
      </div>
      
      {/* Editor */}
      <div className="border border-gray-300 rounded-b-md bg-white">
        <EditorContent editor={editor} />
      </div>
      
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 300px;
          padding: 1rem;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
        }
        .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 0.67em;
          margin-bottom: 0.67em;
        }
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.83em;
          margin-bottom: 0.83em;
        }
        .ProseMirror h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 1em;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #ddd;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

const MultiLanguageTipTapEditor = ({ content, onChange, placeholder = 'Start typing...' }) => {
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const [languageContent, setLanguageContent] = useState(() => {
    if (!content) {
      return {
        en: '',
        es: '',
        pt: '',
        fr: '',
        de: ''
      };
    }
    
    try {
      let parsed;
      if (typeof content === 'string') {
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          return {
            en: content || '',
            es: '',
            pt: '',
            fr: '',
            de: ''
          };
        }
      } else {
        parsed = content;
      }
      
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          en: parsed.en || '',
          es: parsed.es || '',
          pt: parsed.pt || '',
          fr: parsed.fr || '',
          de: parsed.de || ''
        };
      }
    } catch (e) {
      // If parsing fails, use empty defaults
    }
    
    return {
      en: '',
      es: '',
      pt: '',
      fr: '',
      de: ''
    };
  });

  // Update language content when content prop changes from external source
  // Use a ref to track the last content to avoid unnecessary updates
  const lastContentRef = useRef(content);
  
  useEffect(() => {
    // Only update if content changed from external source (not from our own onChange)
    if (content === lastContentRef.current) {
      return;
    }
    
    lastContentRef.current = content;
    
    if (!content) {
      setLanguageContent({
        en: '',
        es: '',
        pt: '',
        fr: '',
        de: ''
      });
      return;
    }
    
    try {
      let parsed;
      if (typeof content === 'string') {
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          // If parsing fails, treat as single HTML string for English
          setLanguageContent({
            en: content || '',
            es: '',
            pt: '',
            fr: '',
            de: ''
          });
          return;
        }
      } else {
        parsed = content;
      }
      
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setLanguageContent({
          en: parsed.en || '',
          es: parsed.es || '',
          pt: parsed.pt || '',
          fr: parsed.fr || '',
          de: parsed.de || ''
        });
      }
    } catch (e) {
      // If parsing fails, keep current content
      console.error('Error parsing terms of use content:', e);
    }
  }, [content]);

  const handleLanguageChange = useCallback((langCode, html) => {
    setLanguageContent(prev => {
      const newContent = {
        ...prev,
        [langCode]: html
      };
      
      // Convert to JSON string and call onChange
      const jsonString = JSON.stringify(newContent);
      lastContentRef.current = jsonString; // Update ref to prevent unnecessary re-renders
      onChange(jsonString);
      
      return newContent;
    });
  }, [onChange]);

  const handleTranslate = useCallback(async () => {
    // Don't translate if source and target are the same
    if (sourceLanguage === activeLanguage) {
      alert('Source and target languages cannot be the same. Please select a different source language.');
      return;
    }

    const sourceHtml = languageContent[sourceLanguage] || '';
    if (!sourceHtml.trim()) {
      alert(`Please enter text in ${LANGUAGES.find(l => l.code === sourceLanguage)?.name || sourceLanguage} first before translating.`);
      return;
    }

    setIsTranslating(true);
    try {
      const translatedHtml = await translationService.translateHtml(
        sourceHtml,
        activeLanguage,
        sourceLanguage
      );
      
      // Verify translation is not empty
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = translatedHtml;
      const translatedText = tempDiv.textContent || tempDiv.innerText || '';
      
      if (!translatedText.trim()) {
        alert('Translation returned empty text. Please try again.');
        setIsTranslating(false);
        return;
      }
      
      // Warn if translation seems identical to source (but still allow it for proper nouns, etc.)
      const sourceDiv = document.createElement('div');
      sourceDiv.innerHTML = sourceHtml;
      const sourceText = sourceDiv.textContent || sourceDiv.innerText || '';
      
      if (sourceText.length > 3 && translatedText.trim().toLowerCase() === sourceText.trim().toLowerCase()) {
        // For longer text, warn but still allow it (might be intentional)
        if (!window.confirm('Translation appears to be the same as source text. Do you want to use it anyway?')) {
          setIsTranslating(false);
          return;
        }
      }

      // Update content for the active language
      const updatedContent = {
        ...languageContent,
        [activeLanguage]: translatedHtml
      };
      
      setLanguageContent(updatedContent);
      
      // Convert to JSON string and call onChange to save
      const jsonString = JSON.stringify(updatedContent);
      lastContentRef.current = jsonString;
      onChange(jsonString);
      
      alert(`Translation completed! ${LANGUAGES.find(l => l.code === activeLanguage)?.name || activeLanguage} content has been updated.`);
    } catch (error) {
      console.error('Translation error:', error);
      alert(`Translation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsTranslating(false);
    }
  }, [activeLanguage, sourceLanguage, languageContent, onChange]);

  return (
    <div className="w-full">
      {/* Language Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-gray-300">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setActiveLanguage(lang.code)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeLanguage === lang.code
                ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </button>
        ))}
      </div>

      {/* Translation Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <label className="text-sm font-medium text-gray-700">
          Translate from:
        </label>
        <select
          value={sourceLanguage}
          onChange={(e) => setSourceLanguage(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">→</span>
        <span className="text-sm font-medium text-gray-700">
          {LANGUAGES.find(l => l.code === activeLanguage)?.flag} {LANGUAGES.find(l => l.code === activeLanguage)?.name}
        </span>
        <button
          type="button"
          onClick={handleTranslate}
          disabled={isTranslating || !languageContent[sourceLanguage]?.trim() || sourceLanguage === activeLanguage}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            isTranslating || !languageContent[sourceLanguage]?.trim() || sourceLanguage === activeLanguage
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          title={`Translate from ${LANGUAGES.find(l => l.code === sourceLanguage)?.name || sourceLanguage} to ${LANGUAGES.find(l => l.code === activeLanguage)?.name || activeLanguage}`}
        >
          <Sparkles className="h-4 w-4" />
          {isTranslating ? 'Translating...' : 'Translate'}
        </button>
      </div>

      {/* Editor for Active Language */}
      <TipTapEditor
        content={languageContent[activeLanguage] || ''}
        onChange={(html) => handleLanguageChange(activeLanguage, html)}
        placeholder={`${placeholder} (${LANGUAGES.find(l => l.code === activeLanguage)?.name})`}
      />
      
      <p className="text-xs text-gray-500 mt-2">
        Currently editing: <strong>{LANGUAGES.find(l => l.code === activeLanguage)?.name}</strong>. 
        Select a source language above and click "Translate" to translate the current language, or switch between language tabs to edit each version manually.
      </p>
    </div>
  );
};

export default MultiLanguageTipTapEditor;

