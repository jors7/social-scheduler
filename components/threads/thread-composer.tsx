'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Link2, ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ThreadPost {
  id: string;
  text: string;
  mediaFiles?: File[];
  mediaUrls?: string[];
}

interface ThreadComposerProps {
  onPost?: (posts: string[]) => void;
  onMediaChange?: (media: (File[] | undefined)[]) => void;
  maxPosts?: number;
  maxCharsPerPost?: number;
  maxMediaPerPost?: number;
  useNumbering?: boolean; // Add numbering to posts [1/3], [2/3], etc.
  autoUpdate?: boolean; // Auto-update parent component on every change
  currentPosts?: string[]; // Current posts from parent
  platform?: 'twitter' | 'threads'; // Platform-specific limits
}

export function ThreadComposer({ 
  onPost, 
  onMediaChange,
  maxPosts = 10, 
  maxCharsPerPost = 500,
  maxMediaPerPost = 4,
  useNumbering = true,
  autoUpdate = false,
  currentPosts = [],
  platform = 'twitter'
}: ThreadComposerProps) {
  const [posts, setPosts] = useState<ThreadPost[]>(() => {
    // Always start with at least one empty post
    return [{ id: '1', text: '', mediaFiles: [], mediaUrls: [] }];
  });
  
  // Set platform-specific limits
  const mediaLimit = platform === 'threads' ? 1 : maxMediaPerPost;

  // Ref to track textareas for auto-resize
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  // Function to adjust textarea height based on content
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  // Initialize parent on mount if autoUpdate is enabled
  useEffect(() => {
    if (autoUpdate && onPost) {
      const postTexts = posts.map(p => p.text);
      onPost(postTexts);
    }
  }, []); // Only run once on mount

  // Sync currentPosts from parent to local state
  useEffect(() => {
    if (currentPosts && currentPosts.length > 0) {
      const newPosts = currentPosts.map((text, index) => ({
        id: (index + 1).toString(),
        text: text,
        mediaFiles: [],
        mediaUrls: []
      }));
      // Only update if the content is actually different
      const currentTexts = posts.map(p => p.text).join('|');
      const newTexts = newPosts.map(p => p.text).join('|');
      if (currentTexts !== newTexts) {
        setPosts(newPosts);
      }
    }
  }, [currentPosts])

  const addPost = () => {
    if (posts.length >= maxPosts) {
      toast.error(`Maximum ${maxPosts} posts per thread`);
      return;
    }
    
    const newPost: ThreadPost = {
      id: Date.now().toString(),
      text: '',
      mediaFiles: [],
      mediaUrls: []
    };
    const updatedPosts = [...posts, newPost];
    setPosts(updatedPosts);
    
    // Update parent if autoUpdate is enabled
    if (autoUpdate) {
      if (onPost) {
        const postTexts = updatedPosts.map(p => p.text);
        onPost(postTexts);
      }
      if (onMediaChange) {
        const media = updatedPosts.map(p => p.mediaFiles);
        onMediaChange(media);
      }
    }
  };

  const removePost = (id: string) => {
    if (posts.length <= 1) {
      toast.error('Thread must have at least one post');
      return;
    }
    const updatedPosts = posts.filter(p => p.id !== id);
    setPosts(updatedPosts);
    
    // Update parent if autoUpdate is enabled
    if (autoUpdate) {
      if (onPost) {
        const postTexts = updatedPosts.map(p => p.text);
        onPost(postTexts);
      }
      if (onMediaChange) {
        const media = updatedPosts.map(p => p.mediaFiles);
        onMediaChange(media);
      }
    }
  };

  const updatePost = (id: string, text: string) => {
    const updatedPosts = posts.map(p => 
      p.id === id ? { ...p, text } : p
    );
    setPosts(updatedPosts);
    
    // Immediately update parent if autoUpdate is enabled
    if (autoUpdate) {
      if (onPost) {
        const postTexts = updatedPosts.map(p => p.text);
        onPost(postTexts);
      }
      if (onMediaChange) {
        const media = updatedPosts.map(p => p.mediaFiles);
        onMediaChange(media);
      }
    }
  };
  
  const handleMediaSelect = (postId: string, files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const post = posts.find(p => p.id === postId);
    
    if (!post) return;
    
    // Check media limit
    const currentCount = post.mediaFiles?.length || 0;
    if (currentCount + fileArray.length > mediaLimit) {
      toast.error(`Maximum ${mediaLimit} ${mediaLimit === 1 ? 'image' : 'images'} per ${platform === 'threads' ? 'post' : 'tweet'}`);
      return;
    }
    
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        const newFiles = [...(p.mediaFiles || []), ...fileArray];
        const newUrls = newFiles.map(f => URL.createObjectURL(f));
        return { ...p, mediaFiles: newFiles, mediaUrls: newUrls };
      }
      return p;
    });
    
    setPosts(updatedPosts);
    
    // Update parent
    if (autoUpdate && onMediaChange) {
      const media = updatedPosts.map(p => p.mediaFiles);
      onMediaChange(media);
    }
  };
  
  const removeMedia = (postId: string, index: number) => {
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        const newFiles = [...(p.mediaFiles || [])];
        const newUrls = [...(p.mediaUrls || [])];
        
        // Revoke the URL to free memory
        if (newUrls[index]) {
          URL.revokeObjectURL(newUrls[index]);
        }
        
        newFiles.splice(index, 1);
        newUrls.splice(index, 1);
        
        return { ...p, mediaFiles: newFiles, mediaUrls: newUrls };
      }
      return p;
    });
    
    setPosts(updatedPosts);
    
    // Update parent
    if (autoUpdate && onMediaChange) {
      const media = updatedPosts.map(p => p.mediaFiles);
      onMediaChange(media);
    }
  };

  const handlePost = () => {
    // Validate posts
    const nonEmptyPosts = posts.filter(p => p.text.trim().length > 0);
    
    if (nonEmptyPosts.length === 0) {
      toast.error('Please add content to at least one post');
      return;
    }

    if (nonEmptyPosts.some(p => p.text.length > maxCharsPerPost)) {
      toast.error(`Each post must be under ${maxCharsPerPost} characters`);
      return;
    }

    // Always call the onPost callback if provided
    // This allows the parent component to handle the actual posting
    if (onPost) {
      onPost(nonEmptyPosts.map(p => p.text));
      toast.info('Thread ready to post. Click "Post Now" to publish.');
    } else {
      toast.error('Thread posting not configured');
    }
  };

  const totalChars = posts.reduce((sum, p) => sum + p.text.length, 0);
  const nonEmptyCount = posts.filter(p => p.text.trim().length > 0).length;

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <Card key={post.id} className="relative">
          <CardContent className="pt-6">
            {index > 0 && (
              <div className="absolute -top-4 left-8 w-0.5 h-4 bg-gray-300 dark:bg-gray-600" />
            )}
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                {index + 1}
              </div>
              
              <div className="flex-1">
                <Textarea
                  ref={(el) => {
                    textareaRefs.current[post.id] = el;
                    adjustTextareaHeight(el);
                  }}
                  value={post.text}
                  onChange={(e) => {
                    updatePost(post.id, e.target.value);
                    adjustTextareaHeight(e.target as HTMLTextAreaElement);
                  }}
                  placeholder={index === 0 ? "Start your thread..." : "Continue thread..."}
                  className="min-h-[100px]"
                  style={{ resize: 'none', overflow: 'hidden' }}
                  maxLength={maxCharsPerPost}
                />
                
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${post.text.length > maxCharsPerPost * 0.9 ? 'text-orange-500' : 'text-gray-500'}`}>
                      {post.text.length}/{maxCharsPerPost}
                    </span>
                    
                    {/* Media upload button */}
                    <div className="relative">
                      <input
                        type="file"
                        id={`media-${post.id}`}
                        accept="image/*,video/*"
                        multiple={mediaLimit > 1}
                        className="hidden"
                        onChange={(e) => handleMediaSelect(post.id, e.target.files)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => document.getElementById(`media-${post.id}`)?.click()}
                        disabled={(post.mediaFiles?.length || 0) >= mediaLimit}
                        className="gap-1"
                      >
                        <ImageIcon className="h-4 w-4" />
                        {post.mediaFiles?.length ? `${post.mediaFiles.length}/${mediaLimit}` : 'Add'}
                      </Button>
                    </div>
                  </div>
                  
                  {posts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePost(post.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Media preview */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {post.mediaUrls.map((url, mediaIndex) => (
                      <div key={mediaIndex} className="relative group">
                        <img
                          src={url}
                          alt={`Media ${mediaIndex + 1}`}
                          className="w-full max-h-40 object-contain rounded-lg bg-gray-100"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeMedia(post.id, mediaIndex)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {index < posts.length - 1 && (
              <div className="absolute -bottom-4 left-8 w-0.5 h-4 bg-gray-300 dark:bg-gray-600" />
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <Button
          variant="outline"
          onClick={addPost}
          disabled={posts.length >= maxPosts}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Post to Thread
        </Button>

        <div className="text-sm text-gray-500">
          {nonEmptyCount} post{nonEmptyCount !== 1 ? 's' : ''} • {totalChars} characters total
        </div>
      </div>

      {!autoUpdate && (
        <Button
          className="w-full"
          size="lg"
          onClick={handlePost}
          disabled={nonEmptyCount === 0}
        >
          <Link2 className="mr-2 h-4 w-4" />
          Prepare Thread ({nonEmptyCount} post{nonEmptyCount !== 1 ? 's' : ''})
        </Button>
      )}
    </div>
  );
}