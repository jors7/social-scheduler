import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function publishBlogPosts() {
  console.log('Starting blog post publication...\n');

  // Get the author
  let authorId: string;

  const { data: author, error: authorError } = await supabase
    .from('blog_authors')
    .select('id')
    .eq('display_name', 'Jan Orsula')
    .single();

  if (authorError || !author) {
    const { data: anyAuthor, error: anyAuthorError } = await supabase
      .from('blog_authors')
      .select('id')
      .limit(1)
      .single();

    if (anyAuthorError || !anyAuthor) {
      console.error('No blog author found. Please create an author first.');
      process.exit(1);
    }
    authorId = anyAuthor.id;
  } else {
    authorId = author.id;
  }

  console.log('Using author ID:', authorId);

  // Blog Post 1: Time Savings
  const post1Content = `<h2>Introduction</h2>
<p>Let's be honest about something.</p>
<p>You didn't become a creator, entrepreneur, or small business owner to spend your days logging into nine different social media apps. You didn't dream of copying and pasting the same caption over and over, tweaking character counts, and manually posting at "optimal times."</p>
<p>Yet here you are. Probably spending 15, 20, even 30 hours a week on social media busywork that doesn't actually grow your business.</p>
<p>I get it. Social media presence is non-negotiable in 2025. Your audience expects you on Instagram, LinkedIn, TikTok, and probably Threads and Bluesky too. The problem isn't posting—it's the time it steals from actual creative work.</p>
<p>Here's the thing: those successful creators you follow? The ones who seem to post everywhere, all the time, while still running their businesses? They're not working harder than you. They're working smarter.</p>
<p>They've cracked the code on social media efficiency, and most of them are saving 15+ hours every week using the strategies I'm about to share.</p>

<h2>The Hidden Time Sinks Most Creators Miss</h2>
<p>Before we fix the problem, we need to understand it.</p>
<p>Most creators dramatically underestimate how much time they spend on social media. When I ask people to guess, they usually say "a few hours a day." When they actually track it, the reality is often 4-5 hours daily—sometimes more.</p>

<h3>Context Switching (The Silent Killer)</h3>
<p>Every time you switch from Instagram to LinkedIn to TikTok, your brain needs time to recalibrate. Different interfaces. Different content formats. Different posting flows.</p>
<p>Research shows it takes an average of 23 minutes to fully refocus after switching tasks. If you're hopping between 7 platforms throughout the day, you're losing hours just to context switching.</p>
<p><strong>Time lost weekly: 3-5 hours</strong></p>

<h3>Manual Posting at "Optimal Times"</h3>
<p>You've read the articles. You know that Instagram engagement peaks at 11am on Wednesdays, LinkedIn at 9am on Tuesdays, TikTok at 7pm on Thursdays.</p>
<p>So you set reminders. You interrupt your workflow. You stop what you're doing to post when the algorithm gods demand it.</p>
<p><strong>Time lost weekly: 2-3 hours</strong></p>

<h3>Content Recreation for Each Platform</h3>
<p>You have a great insight to share. On Twitter (X), it's a punchy one-liner. On LinkedIn, it needs more context. On Instagram, you need a visual. On TikTok, maybe a video.</p>
<p>Without a system, you're essentially creating the same content five times instead of once.</p>
<p><strong>Time lost weekly: 4-6 hours</strong></p>

<h3>Scattered Analytics Review</h3>
<p>Tuesday you check Instagram insights. Thursday you remember to look at LinkedIn analytics. By the weekend, you've forgotten what the Instagram numbers said.</p>
<p>Without consolidated analytics, you can't see patterns. Without patterns, you can't optimize.</p>
<p><strong>Time lost weekly: 2-3 hours</strong></p>

<p><strong>Total: 14-22+ hours weekly on tasks that don't require your creative brain.</strong></p>

<h2>Strategy 1: The Batching Method</h2>
<p>Content batching isn't new advice, but most people do it wrong.</p>
<p>They try to batch a month of content in one sitting, burn out by hour three, and never batch again.</p>
<p>Here's a better approach: <strong>The 2-Hour Power Block.</strong></p>

<h3>How It Works</h3>
<p><strong>Hour 1: Ideation + Writing (Tuesday morning)</strong></p>
<ul>
<li>Review what performed well last week (10 minutes)</li>
<li>Brain dump content ideas for the week (15 minutes)</li>
<li>Write 5-7 core pieces of content (35 minutes)</li>
</ul>

<p><strong>Hour 2: Production + Scheduling (Thursday morning)</strong></p>
<ul>
<li>Create any visuals needed (20 minutes)</li>
<li>Adapt content for each platform (20 minutes)</li>
<li>Schedule everything for the following week (20 minutes)</li>
</ul>

<p>Four hours per week of focused work replaces 15+ hours of scattered effort.</p>

<h3>The Tool That Makes It Work</h3>
<p>Batching only saves time if scheduling is fast. If you're spending 20 minutes navigating each platform's native scheduling, you haven't actually saved anything.</p>
<p>This is where a multi-platform scheduler becomes essential. Tools like SocialCal let you schedule a week's worth of content across all 9 platforms in a single session. One dashboard. One upload. Multiple platforms.</p>

<h2>Strategy 2: The One-Post-Nine-Platforms Framework</h2>
<p>Here's a truth most social media "experts" won't tell you: your audience doesn't care if you post similar content across platforms.</p>
<p>Your Instagram followers aren't also following you on LinkedIn, TikTok, AND Bluesky. There's minimal overlap. What feels repetitive to you is fresh content to each platform's audience.</p>

<h3>Step 1: Create One Core Piece of Content</h3>
<p>Start with your insight, tip, story, or promotion in its purest form. Don't think about platforms yet—just capture the idea.</p>

<h3>Step 2: Adapt for Platform Character Limits</h3>
<ul>
<li><strong>Twitter/X:</strong> 280 characters — needs to be punchy</li>
<li><strong>LinkedIn:</strong> 3,000 characters — can add context and story</li>
<li><strong>Instagram caption:</strong> 2,200 characters — visual-first, caption supports</li>
<li><strong>Threads:</strong> 500 characters — conversational tone</li>
<li><strong>Bluesky:</strong> 300 characters — Twitter-like brevity</li>
</ul>

<h3>Step 3: Customize Tone, Not Message</h3>
<p>The message stays the same. The delivery shifts.</p>
<p><strong>LinkedIn version (professional):</strong> "Early in my creator journey, I made a mistake that cost me months of progress: I tried to be everywhere at once. Here's what I learned about platform focus..."</p>
<p><strong>Twitter version (punchy):</strong> "Biggest creator mistake: trying to be everywhere. Master 2-3 platforms first. I hit 10K on just IG + Twitter before expanding. Focus > breadth."</p>

<h2>Strategy 3: AI-Assisted Caption Writing</h2>
<p>Staring at a blank caption box is one of the biggest time wasters in social media.</p>
<p>AI changes this equation entirely.</p>

<h3>How to Use AI for Captions (Without Sounding Robotic)</h3>
<p>The key is using AI as a starting point, not a final product.</p>
<ol>
<li><strong>Give AI the Core Message:</strong> Feed your core content into an AI tool.</li>
<li><strong>Select a Tone:</strong> Professional, Casual, Funny, or Inspirational.</li>
<li><strong>Edit for Your Voice:</strong> AI gives you 80%. You add the 20% that makes it yours.</li>
</ol>

<p><strong>Time Savings:</strong> Without AI: 10-15 minutes per caption × 5 platforms = 50-75 minutes. With AI: 2-3 minutes × 5 platforms = 10-15 minutes.</p>
<p><strong>Weekly savings: 2-4 hours</strong></p>

<h2>Strategy 4: Template Your Recurring Content</h2>
<p>Every creator has content patterns. Instead of creating these from scratch each time, create templates.</p>

<h3>Template Examples</h3>
<p><strong>Engagement Question Template:</strong> "[Controversial opinion about industry]. I think [your take]. But I want to hear from you—[question]?"</p>
<p><strong>Behind the Scenes Template:</strong> "What I'm working on this week: [brief description]. Here's a sneak peek at [specific element]."</p>

<h2>Strategy 5: Consolidate Your Analytics Review</h2>
<p>Checking analytics on each platform separately isn't just time-consuming—it's ineffective.</p>

<h3>The 15-Minute Weekly Analytics Routine</h3>
<ul>
<li><strong>Minutes 1-5:</strong> Overview Metrics</li>
<li><strong>Minutes 6-10:</strong> Top Performers</li>
<li><strong>Minutes 11-15:</strong> Action Items</li>
</ul>

<p>SocialCal's analytics dashboard pulls metrics from all platforms into one view. One login. One dashboard. One 15-minute routine.</p>

<h2>Putting It All Together</h2>
<p><strong>Total active work: ~5 hours</strong></p>
<p><strong>Previous time spent: 20+ hours</strong></p>
<p><strong>Hours reclaimed: 15+</strong></p>

<h2>Ready to Reclaim Your Time?</h2>
<p>SocialCal was built specifically for creators who want these benefits without the enterprise price tag.</p>
<p><strong>Start your 7-day free trial today.</strong> No credit card required.</p>`;

  // Blog Post 2: Comparison
  const post2Content = `<h2>Introduction</h2>
<p>Choosing a social media scheduler in 2025 feels like buying a car.</p>
<p>Everyone claims to have the best features. Pricing pages require a mathematics degree to decode. And the "comparison" articles you find are usually written by the companies themselves.</p>
<p>You deserve better. This comparison is genuinely honest.</p>

<h2>Quick Verdict: The Comparison Matrix</h2>
<table>
<thead>
<tr><th>Feature</th><th>Buffer</th><th>Hootsuite</th><th>Later</th><th>SocialCal</th></tr>
</thead>
<tbody>
<tr><td><strong>Starting Price</strong></td><td>$6/mo per channel</td><td>$99/mo</td><td>$18/mo</td><td>$9/mo</td></tr>
<tr><td><strong>Platforms Supported</strong></td><td>8</td><td>10+</td><td>7</td><td>9</td></tr>
<tr><td><strong>Threads Support</strong></td><td>No</td><td>Limited</td><td>No</td><td>Yes</td></tr>
<tr><td><strong>Bluesky Support</strong></td><td>No</td><td>No</td><td>No</td><td>Yes</td></tr>
<tr><td><strong>AI Caption Writer</strong></td><td>Paid add-on</td><td>Enterprise only</td><td>No</td><td>Included</td></tr>
<tr><td><strong>Best For</strong></td><td>Simple 2-3 platform users</td><td>Enterprise teams</td><td>Instagram-first</td><td>Multi-platform creators</td></tr>
</tbody>
</table>

<h2>Buffer: The Established Veteran</h2>
<h3>Pricing (The Real Numbers)</h3>
<p>Buffer's pricing is <strong>per channel</strong>: $6/month per channel on Essentials. 5 platforms = $30/month.</p>

<h3>What Buffer Does Well</h3>
<ul>
<li><strong>Clean Interface:</strong> Genuinely intuitive.</li>
<li><strong>Reliable Publishing:</strong> Posts go out when scheduled.</li>
</ul>

<h3>Where Buffer Falls Short</h3>
<ul>
<li><strong>Per-Channel Pricing:</strong> 7 platforms = $42-84/month.</li>
<li><strong>No Threads or Bluesky support.</strong></li>
<li><strong>AI costs extra.</strong></li>
</ul>

<h2>Hootsuite: The Enterprise Giant</h2>
<h3>Pricing</h3>
<p>Starts at <strong>$99/month</strong>. No starter tier. $1,188/year for scheduling posts.</p>

<h3>What Hootsuite Does Well</h3>
<ul>
<li>Comprehensive features</li>
<li>Enterprise-grade reliability</li>
</ul>

<h3>Where Hootsuite Falls Short</h3>
<ul>
<li>Overwhelming for solo users</li>
<li>That price tag</li>
<li>No Bluesky support</li>
</ul>

<h2>Later: The Visual-First Platform</h2>
<h3>Pricing</h3>
<p>Starter: $18/month (30 posts per profile)</p>

<h3>What Later Does Well</h3>
<ul>
<li>Best-in-class visual planner</li>
<li>Linkin.bio tool</li>
</ul>

<h3>Where Later Falls Short</h3>
<ul>
<li>Instagram-centric</li>
<li>No Threads or Bluesky</li>
<li>Post limits on cheaper plans</li>
</ul>

<h2>SocialCal: The Creator-Built Alternative</h2>
<h3>Pricing</h3>
<ul>
<li><strong>Starter:</strong> $9/month (unlimited posts)</li>
<li><strong>Professional:</strong> $19/month (AI captions, advanced analytics)</li>
<li><strong>Enterprise:</strong> $29/month (unlimited accounts)</li>
</ul>

<h3>What SocialCal Does Well</h3>
<ul>
<li><strong>9 platforms including Threads AND Bluesky</strong></li>
<li><strong>AI Caption Writer included</strong></li>
<li><strong>Unified Analytics Dashboard</strong></li>
<li><strong>Zero learning curve</strong></li>
</ul>

<h3>Honest Limitations</h3>
<ul>
<li>Newer platform</li>
<li>No Instagram Stories scheduling (yet)</li>
<li>Limited team features</li>
</ul>

<h2>Real Cost Comparison: 5-Platform Creator</h2>
<table>
<thead>
<tr><th>Tool</th><th>Monthly</th><th>Yearly</th></tr>
</thead>
<tbody>
<tr><td>Buffer</td><td>$30</td><td>$360</td></tr>
<tr><td>Hootsuite</td><td>$99</td><td>$1,188</td></tr>
<tr><td>Later</td><td>$40</td><td>$480</td></tr>
<tr><td>SocialCal</td><td>$9-19</td><td>$108-228</td></tr>
</tbody>
</table>

<h2>The Decision Tree</h2>
<h3>Choose Hootsuite if:</h3>
<p>You manage social for a company with a marketing team and budget isn't a concern.</p>

<h3>Choose Buffer if:</h3>
<p>You only use 2-3 platforms and value extreme simplicity.</p>

<h3>Choose Later if:</h3>
<p>Instagram is 70%+ of your focus and visual grid planning is essential.</p>

<h3>Choose SocialCal if:</h3>
<p>You're active on 4+ platforms, budget matters, and you want Threads/Bluesky support.</p>

<h2>My Honest Recommendation</h2>
<p>Most solo creators are dramatically overpaying for social media scheduling.</p>
<p>For most people reading this article, SocialCal offers the best combination of platform support, features, and price.</p>
<p><strong>Try the 7-day free trial</strong> and see for yourself.</p>`;

  // Blog Post 3: Threads & Bluesky
  const post3Content = `<h2>Introduction</h2>
<p>Remember when everyone was "just on Twitter"?</p>
<p>That era is over. Two platforms emerged from the chaos as legitimate Twitter alternatives: <strong>Threads</strong> and <strong>Bluesky</strong>.</p>
<p>And here's what most creators are missing: these platforms represent a once-in-a-generation opportunity for organic growth.</p>
<p>Right now, Threads and Bluesky are in their "early Instagram" phase. Algorithms haven't fully crystallized. Organic reach is still possible.</p>

<h2>Part 1: Understanding the Opportunity</h2>

<h3>Why Threads Matters</h3>
<ul>
<li><strong>Instagram Integration:</strong> Your Instagram followers can follow you with one tap.</li>
<li><strong>Meta's Algorithm Expertise:</strong> Content gets discovered effectively.</li>
<li><strong>Less Toxic Environment:</strong> More conversational, more positive.</li>
</ul>

<h3>Why Bluesky Matters</h3>
<ul>
<li><strong>Decentralized Architecture:</strong> Not controlled by one company's whims.</li>
<li><strong>Custom Feeds:</strong> Genuine communities around topics.</li>
<li><strong>Tech-Savvy Early Adopters:</strong> If that's your audience, they're there.</li>
<li><strong>Algorithm-Free Options:</strong> Chronological feeds available.</li>
</ul>

<h2>Part 2: What's Different About Each Platform</h2>

<h3>Threads: The Casual Conversation Platform</h3>
<p><strong>Character Limit:</strong> 500 characters</p>
<p><strong>What Works:</strong> Personal stories, relatable observations, quick tips, questions that spark replies.</p>
<p><strong>What Doesn't Work:</strong> Corporate content, heavy self-promotion, link-heavy posts.</p>

<h3>Bluesky: The Community-Focused Platform</h3>
<p><strong>Character Limit:</strong> 300 characters</p>
<p><strong>What Works:</strong> Thoughtful observations, tech/creator content, community discussions.</p>
<p><strong>What Doesn't Work:</strong> Generic motivational content, ignoring replies.</p>

<h2>Part 3: Content Strategy</h2>

<h3>Threads Framework</h3>
<ul>
<li>40% Relatable Observations</li>
<li>30% Quick Valuable Tips</li>
<li>20% Questions and Engagement</li>
<li>10% Soft Promotion</li>
</ul>

<h3>Bluesky Framework</h3>
<ul>
<li>40% Thoughtful Observations</li>
<li>30% Community Participation</li>
<li>20% Expertise Sharing</li>
<li>10% Cross-Platform Content</li>
</ul>

<h2>Part 4: Growth Tactics</h2>

<h3>Growing on Threads</h3>
<ol>
<li>Leverage Your Instagram Audience</li>
<li>Use Multi-Post Features</li>
<li>Post When Instagram Users Are Active</li>
<li>Engage Early and Often</li>
<li>Avoid Links in Posts</li>
</ol>

<h3>Growing on Bluesky</h3>
<ol>
<li>Join Starter Packs</li>
<li>Create or Contribute to Custom Feeds</li>
<li>Use Your Domain as Your Handle</li>
<li>Engage With Growing Accounts</li>
</ol>

<h2>Part 5: The Cross-Posting Solution</h2>
<p>Most schedulers don't support these platforms:</p>
<ul>
<li>Buffer: No Threads, no Bluesky</li>
<li>Hootsuite: Limited Threads, no Bluesky</li>
<li>Later: No Threads, no Bluesky</li>
</ul>
<p><strong>SocialCal is currently the only major scheduler supporting both Threads AND Bluesky.</strong></p>

<h2>Part 6: 30-Day Launch Plan</h2>
<p><strong>Week 1:</strong> Set up profiles, follow relevant accounts, post 1x daily</p>
<p><strong>Week 2:</strong> Increase to 2x daily, test different formats</p>
<p><strong>Week 3:</strong> Double down on what works, start scheduling</p>
<p><strong>Week 4:</strong> Create templates, establish sustainable schedule</p>

<h3>30-Day Goals</h3>
<ul>
<li><strong>Threads:</strong> 200-500 followers</li>
<li><strong>Bluesky:</strong> 100-300 followers</li>
<li><strong>Daily time:</strong> Under 30 minutes combined</li>
</ul>

<h2>Conclusion</h2>
<p>Threads and Bluesky's windows are open today. But they won't be forever.</p>
<p>The best time to start was six months ago. The second-best time is now.</p>
<p><strong>Start your 7-day free trial</strong> and schedule your first posts today.</p>`;

  // Blog Post 4: Analytics
  const post4Content = `<h2>Introduction</h2>
<p>Let's talk about social media analytics.</p>
<p>I know. Your eyes are already glazing over.</p>
<p>Here's what nobody tells you: most creators are either completely ignoring their analytics OR obsessing over metrics that don't actually matter.</p>
<p>The truth is, understanding your analytics requires understanding exactly 4 key metrics, spending 15 minutes per week reviewing them, and knowing what actions to take.</p>

<h2>The Only 4 Metrics That Actually Matter</h2>

<h3>Metric 1: Reach</h3>
<p><strong>What it is:</strong> The number of unique accounts that saw your content.</p>
<p><strong>Why it matters:</strong> Reach tells you how many actual humans your content touched.</p>

<h3>Metric 2: Engagement</h3>
<p><strong>What it is:</strong> Total interactions—likes, comments, shares, saves, clicks combined.</p>
<p><strong>Why it matters:</strong> It measures whether people cared enough to do something.</p>

<h3>Metric 3: Engagement Rate</h3>
<p><strong>What it is:</strong> Engagement divided by reach, as a percentage.</p>
<p><strong>The formula:</strong> (Total Engagements / Reach) × 100</p>
<p><strong>Why it matters:</strong> This is the great equalizer. It shows how compelling your content is regardless of reach.</p>

<h4>Engagement Rate Benchmarks</h4>
<table>
<thead>
<tr><th>Platform</th><th>Average</th><th>Good</th><th>Great</th></tr>
</thead>
<tbody>
<tr><td>Instagram</td><td>1-3%</td><td>3-6%</td><td>6%+</td></tr>
<tr><td>TikTok</td><td>3-6%</td><td>6-10%</td><td>10%+</td></tr>
<tr><td>LinkedIn</td><td>2-4%</td><td>4-6%</td><td>6%+</td></tr>
<tr><td>Twitter/X</td><td>0.5-1%</td><td>1-3%</td><td>3%+</td></tr>
<tr><td>Threads</td><td>2-4%</td><td>4-8%</td><td>8%+</td></tr>
</tbody>
</table>

<h3>Metric 4: Growth Trend</h3>
<p><strong>What it is:</strong> Are your metrics going up, down, or flat over time?</p>
<p><strong>Why it matters:</strong> A single week tells you nothing. The trend matters.</p>

<h2>Reach vs. Impressions: Finally Explained</h2>
<ul>
<li><strong>Reach</strong> = Unique accounts that saw your content</li>
<li><strong>Impressions</strong> = Total times your content was displayed</li>
</ul>
<p><strong>Reach matters more for most creators.</strong></p>

<h2>The 15-Minute Weekly Analytics Routine</h2>
<p><strong>Minutes 1-5: Overview Scan</strong> - Total posts, engagement, reach</p>
<p><strong>Minutes 6-10: Top Performers</strong> - What do your top 3 posts have in common?</p>
<p><strong>Minutes 11-13: Underperformers</strong> - What was different?</p>
<p><strong>Minutes 14-15: Action Items</strong> - 2-3 adjustments for next week</p>

<h2>Platform-Specific Metrics Cheat Sheet</h2>
<h3>Instagram</h3>
<ul>
<li><strong>Saves:</strong> Indicates valuable content. Algorithm loves saves.</li>
<li><strong>Shares to Stories:</strong> Word-of-mouth amplification.</li>
</ul>

<h3>TikTok</h3>
<ul>
<li><strong>Watch Time:</strong> More important than view count.</li>
<li><strong>Completion Rate:</strong> Over 50% is good. Over 70% is excellent.</li>
</ul>

<h3>YouTube</h3>
<ul>
<li><strong>Watch Time:</strong> The algorithm cares deeply about this.</li>
<li><strong>Audience Retention:</strong> Shows where people drop off.</li>
</ul>

<h2>The Content Optimization Loop</h2>
<ol>
<li><strong>Observe:</strong> Track metrics weekly</li>
<li><strong>Hypothesize:</strong> "Carousels perform better than static images"</li>
<li><strong>Test:</strong> Post more carousels</li>
<li><strong>Analyze:</strong> Did it confirm the hypothesis?</li>
<li><strong>Implement:</strong> Make it part of your strategy</li>
</ol>

<h2>The Cross-Platform Analytics Problem</h2>
<p>Your "15-minute routine" becomes an hour when you're logging into 7 different platforms.</p>

<h3>Solution: Unified Dashboards</h3>
<p>SocialCal's analytics dashboard pulls metrics from Facebook, Instagram, Threads, Bluesky, Pinterest, TikTok, and YouTube into one view. Export to CSV when needed.</p>

<h2>Conclusion</h2>
<p>You need to understand four metrics: reach, engagement, engagement rate, and growth trends.</p>
<p>You need a 15-minute weekly routine.</p>
<p>You need to turn data into action.</p>
<p>That's it. The creators who win long-term are the ones who pay attention.</p>
<p><strong>Try SocialCal free for 7 days</strong> and see how simple analytics can be.</p>`;

  // Define blog posts
  const blogPosts = [
    {
      slug: 'save-15-hours-weekly-social-media-scheduling-playbook',
      title: "How to Save 15+ Hours Every Week on Social Media (The Creator's Scheduling Playbook)",
      excerpt: 'Learn the exact strategies creators use to save 15+ hours weekly on social media management. From batching content to AI captions, this playbook shows you how to post consistently without burning out.',
      content: post1Content,
      featured_image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&h=630&fit=crop&q=80',
      author_id: authorId,
      category: 'productivity',
      tags: ['social media scheduling', 'time management', 'productivity', 'content batching', 'AI captions'],
      reading_time: 14,
      status: 'published',
      published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      featured: true,
      meta_title: 'How to Save 15+ Hours Every Week on Social Media | SocialCal',
      meta_description: 'Learn the exact strategies creators use to save 15+ hours weekly on social media management.',
      meta_keywords: ['social media scheduling', 'save time social media', 'content batching']
    },
    {
      slug: 'buffer-vs-hootsuite-vs-later-vs-socialcal-comparison-2025',
      title: 'Buffer vs. Hootsuite vs. Later vs. SocialCal: The Honest 2025 Comparison for Solo Creators',
      excerpt: 'Tired of confusing pricing and feature lists? This honest comparison shows you exactly which social media scheduler fits your needs and budget in 2025.',
      content: post2Content,
      featured_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop&q=80',
      author_id: authorId,
      category: 'social-media-tips',
      tags: ['social media scheduler', 'Buffer alternative', 'Hootsuite alternative', 'Later alternative'],
      reading_time: 13,
      status: 'published',
      published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      featured: false,
      meta_title: 'Buffer vs Hootsuite vs Later vs SocialCal: 2025 Comparison',
      meta_description: 'Honest comparison of Buffer, Hootsuite, Later, and SocialCal for solo creators.',
      meta_keywords: ['best social media scheduler 2025', 'Buffer vs Hootsuite', 'Later alternative']
    },
    {
      slug: 'complete-guide-threads-bluesky-2025',
      title: 'The Complete Guide to Posting on Threads and Bluesky in 2025 (And Why You Should Start Now)',
      excerpt: 'Learn how to grow your audience on Threads and Bluesky—the two fastest-growing Twitter alternatives.',
      content: post3Content,
      featured_image: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=1200&h=630&fit=crop&q=80',
      author_id: authorId,
      category: 'social-media-tips',
      tags: ['Threads', 'Bluesky', 'Twitter alternatives', 'social media growth'],
      reading_time: 14,
      status: 'published',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      featured: false,
      meta_title: 'Complete Guide to Posting on Threads and Bluesky in 2025',
      meta_description: 'Learn how to grow on Threads and Bluesky—content strategies, growth tactics, and scheduling.',
      meta_keywords: ['how to post on Threads', 'Bluesky guide', 'Threads scheduler']
    },
    {
      slug: 'how-to-understand-social-media-analytics-beginners-guide',
      title: 'How to Read Your Social Media Analytics (Without a Marketing Degree)',
      excerpt: 'Confused by social media metrics? This beginner-friendly guide breaks down exactly which numbers matter.',
      content: post4Content,
      featured_image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop&q=80',
      author_id: authorId,
      category: 'marketing-strategy',
      tags: ['social media analytics', 'engagement rate', 'metrics', 'reach vs impressions'],
      reading_time: 15,
      status: 'published',
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      featured: false,
      meta_title: "How to Understand Social Media Analytics - Beginner's Guide",
      meta_description: 'Confused by social media metrics? This guide breaks down which numbers matter.',
      meta_keywords: ['social media analytics', 'engagement rate', 'reach vs impressions']
    }
  ];

  console.log(`\nAttempting to publish ${blogPosts.length} blog posts...\n`);

  for (const post of blogPosts) {
    // Check if post already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', post.slug)
      .single();

    if (existing) {
      console.log(`⏭️  Skipped: "${post.title.substring(0, 50)}..." (already exists)`);
      continue;
    }

    const { error } = await supabase
      .from('blog_posts')
      .insert([post]);

    if (error) {
      console.error(`❌ Error publishing "${post.title.substring(0, 50)}...":`, error.message);
    } else {
      console.log(`✅ Published: "${post.title.substring(0, 50)}..."`);
      console.log(`   URL: /blog/${post.slug}`);
    }
  }

  console.log('\n✨ Blog post publication complete!');
  console.log('\nView your posts at:');
  console.log('  - https://www.socialcal.app/blog');
}

publishBlogPosts().catch(console.error);
