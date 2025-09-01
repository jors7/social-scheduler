'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface ThreadPost {
  id: string;
  text: string;
}

interface ThreadComposerProps {
  onPost?: (posts: string[]) => void;
  maxPosts?: number;
  maxCharsPerPost?: number;
  useNumbering?: boolean; // Add numbering to posts [1/3], [2/3], etc.
}

export function ThreadComposer({ 
  onPost, 
  maxPosts = 10, 
  maxCharsPerPost = 500,
  useNumbering = true 
}: ThreadComposerProps) {
  const [posts, setPosts] = useState<ThreadPost[]>([
    { id: '1', text: '' }
  ]);
  const [isPosting, setIsPosting] = useState(false);

  const addPost = () => {
    if (posts.length >= maxPosts) {
      toast.error(`Maximum ${maxPosts} posts per thread`);
      return;
    }
    
    const newPost: ThreadPost = {
      id: Date.now().toString(),
      text: ''
    };
    setPosts([...posts, newPost]);
  };

  const removePost = (id: string) => {
    if (posts.length <= 1) {
      toast.error('Thread must have at least one post');
      return;
    }
    setPosts(posts.filter(p => p.id !== id));
  };

  const updatePost = (id: string, text: string) => {
    setPosts(posts.map(p => 
      p.id === id ? { ...p, text } : p
    ));
  };

  const handlePost = async () => {
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

    setIsPosting(true);

    try {
      if (onPost) {
        await onPost(nonEmptyPosts.map(p => p.text));
      } else {
        // Default behavior - call the API directly
        const response = await fetch('/api/post/threads/thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            posts: nonEmptyPosts.map(p => p.text)
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to post thread');
        }

        if (data.partial) {
          toast.warning(data.message);
        } else {
          toast.success(`Thread posted with ${data.posts.length} posts!`);
        }

        // Clear the composer
        setPosts([{ id: '1', text: '' }]);
      }
    } catch (error) {
      console.error('Thread posting error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to post thread');
    } finally {
      setIsPosting(false);
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
                  value={post.text}
                  onChange={(e) => updatePost(post.id, e.target.value)}
                  placeholder={index === 0 ? "Start your thread..." : "Continue thread..."}
                  className="min-h-[100px] resize-none"
                  maxLength={maxCharsPerPost}
                />
                
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-sm ${post.text.length > maxCharsPerPost * 0.9 ? 'text-orange-500' : 'text-gray-500'}`}>
                    {post.text.length}/{maxCharsPerPost}
                  </span>
                  
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
              </div>
            </div>

            {index < posts.length - 1 && (
              <div className="absolute -bottom-4 left-8 w-0.5 h-4 bg-gray-300 dark:bg-gray-600" />
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between items-center">
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

      <Button
        className="w-full"
        size="lg"
        onClick={handlePost}
        disabled={isPosting || nonEmptyCount === 0}
      >
        {isPosting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Posting Thread...
          </>
        ) : (
          <>
            <Link2 className="mr-2 h-4 w-4" />
            Post Thread ({nonEmptyCount} post{nonEmptyCount !== 1 ? 's' : ''})
          </>
        )}
      </Button>
    </div>
  );
}