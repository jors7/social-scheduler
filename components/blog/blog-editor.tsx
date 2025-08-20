'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Youtube from '@tiptap/extension-youtube'
import TextAlign from '@tiptap/extension-text-align'
import { common, createLowlight } from 'lowlight'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Quote,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Table as TableIcon,
  Youtube as YoutubeIcon,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X
} from 'lucide-react'
import { useCallback, useState, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import styles from './blog-editor.module.css'

const lowlight = createLowlight(common)

interface BlogEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
}

export function BlogEditor({
  content = '',
  onChange,
  placeholder = 'Start writing your blog post...',
  className = ''
}: BlogEditorProps) {
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [, forceUpdate] = useState({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      
      // Try to use Cloudflare upload endpoint first
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/blog/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        // Fallback to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `blog-images/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath)

        return publicUrl
      }
      
      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
      return null
    } finally {
      setUploading(false)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    const url = await uploadImage(file)
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    noClick: true,
    noDragEventsBubbling: true
  })

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4'
        }
      }),
      // Table extensions - conditionally add if available
      ...(Table ? [
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: 'border-collapse table-auto w-full my-4'
          }
        }),
        TableRow,
        TableHeader.configure({
          HTMLAttributes: {
            class: 'border border-gray-300 px-4 py-2 bg-gray-50 font-semibold'
          }
        }),
        TableCell.configure({
          HTMLAttributes: {
            class: 'border border-gray-300 px-4 py-2'
          }
        })
      ] : []),
      Placeholder.configure({
        placeholder
      }),
      CharacterCount,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      ...(CodeBlockLowlight ? [
        CodeBlockLowlight.configure({
          lowlight,
          HTMLAttributes: {
            class: 'bg-gray-900 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto'
          }
        })
      ] : []),
      ...(Youtube ? [
        Youtube.configure({
          width: 640,
          height: 480,
          HTMLAttributes: {
            class: 'rounded-lg my-4'
          }
        })
      ] : [])
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: styles.editor
      }
    },
    // Force re-render when content changes
    onCreate: ({ editor }) => {
      // Force toolbar update after creation
      editor.on('selectionUpdate', () => {
        // Force re-render to update toolbar state
        forceUpdate({})
      })
      editor.on('transaction', () => {
        // Force re-render on any transaction to keep toolbar in sync
        forceUpdate({})
      })
    },
    // Ensure editor updates on focus
    autofocus: false,
    editable: true
  }, [])

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const setLink = useCallback(() => {
    if (!linkUrl) {
      editor?.chain().focus().unsetLink().run()
      setShowLinkInput(false)
      return
    }

    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
    editor?.chain().focus().setLink({ href: url }).run()
    setShowLinkInput(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  const addYoutubeVideo = useCallback(() => {
    if (!youtubeUrl) {
      setShowYoutubeInput(false)
      return
    }

    editor?.commands.setYoutubeVideo({
      src: youtubeUrl,
    })
    setShowYoutubeInput(false)
    setYoutubeUrl('')
  }, [editor, youtubeUrl])

  const addTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = await uploadImage(file)
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      <div className="border-b p-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor?.isActive('bold') ? 'bg-gray-100' : ''}
            data-active={editor?.isActive('bold')}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor?.isActive('italic') ? 'bg-gray-100' : ''}
            data-active={editor?.isActive('italic')}
          >
            <Italic className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-100' : ''}
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-100' : ''}
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-gray-100' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-gray-100' : ''}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'bg-gray-100' : ''}
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={editor.isActive('codeBlock') ? 'bg-gray-100' : ''}
          >
            <Code className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'bg-gray-100' : ''}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'bg-gray-100' : ''}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'bg-gray-100' : ''}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLinkInput(!showLinkInput)}
            className={editor.isActive('link') ? 'bg-gray-100' : ''}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleImageUpload}
            disabled={uploading}
          >
            {uploading ? (
              <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </Button>
          {Table && (
            <Button
              variant="ghost"
              size="sm"
              onClick={addTable}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          )}
          {Youtube && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowYoutubeInput(!showYoutubeInput)}
            >
              <YoutubeIcon className="h-4 w-4" />
            </Button>
          )}
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
        
        {showLinkInput && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded">
            <input
              type="text"
              placeholder="Enter URL..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setLink()}
              className="flex-1 px-2 py-1 border rounded text-sm"
              autoFocus
            />
            <Button size="sm" onClick={setLink}>Apply</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowLinkInput(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {showYoutubeInput && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded">
            <input
              type="text"
              placeholder="Enter YouTube URL..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addYoutubeVideo()}
              className="flex-1 px-2 py-1 border rounded text-sm"
              autoFocus
            />
            <Button size="sm" onClick={addYoutubeVideo}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowYoutubeInput(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <div {...getRootProps()} className="relative">
        <input {...getInputProps()} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {isDragActive && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-90 z-10 flex items-center justify-center rounded-b-lg">
            <div className="text-center">
              <Upload className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <p className="text-blue-600 font-medium">Drop image here to upload</p>
            </div>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
      
      <div className="border-t px-4 py-2 text-sm text-gray-500">
        {editor.storage.characterCount.characters()} characters
      </div>
    </div>
  )
}