# 🎨 Lumina Paint

A collaborative painting app built with Next.js and Supabase. Think MS Paint, but you can invite friends to draw on the same canvas in real-time.

## What It Does

Lumina Paint lets you create drawing sessions that anyone can join with a link. Multiple people can draw, erase, and see each other's cursors moving around the canvas simultaneously. Sessions are temporary—they exist as long as people are connected, then disappear.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Authentication and real-time collaboration
  - Auth for user accounts
  - Realtime Channels for live drawing sync
  - Presence tracking for cursors and online users
- **shadcn/ui** - UI components

## Features

- Real-time collaborative drawing
- Multiple tools: brush, eraser, line, rectangle, circle, fill bucket
- Color picker with custom colors
- Adjustable brush sizes
- Undo/redo
- Clear canvas
- Download as PNG or PDF
- Live cursor tracking
- See who's online
- Shareable session links

## How It Works

When you create a new session, you get a unique session ID (like `m8k3j-x9q2w`). Share that link with anyone, and they'll join the same canvas. All drawing happens client-side in an HTML canvas, and Supabase Realtime broadcasts every stroke to everyone in the session.

The canvas data isn't stored anywhere—it only exists while people are connected. Once everyone leaves, the session is gone. If you want to keep your work, download it as an image.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account ([sign up free](https://supabase.com))

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/j9shah/lumina.git
   cd lumina
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Supabase project at [supabase.com/dashboard](https://supabase.com/dashboard)

4. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

5. Add your Supabase credentials to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_anon_key
   ```
   
   Get these from: Supabase Dashboard → Project Settings → API

6. Configure Supabase Auth:
   - Go to Authentication → URL Configuration
   - Add these redirect URLs:
     - `http://localhost:3000/auth/confirm` (for local dev)
     - `https://your-domain.vercel.app/auth/confirm` (for production)

7. Run the development server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
lumina/
├── src/
│   ├── app/
│   │   ├── auth/              # Login, signup, password reset pages
│   │   ├── protected/         # Authenticated routes
│   │   │   ├── page.tsx       # Session creation/join dashboard
│   │   │   └── canvas/[sessionId]/
│   │   │       └── page.tsx   # The actual drawing canvas
│   │   ├── layout.tsx         # Root layout with theme provider
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── auth/              # Authentication forms and buttons
│   │   └── ui/                # Reusable UI components (shadcn)
│   ├── lib/
│   │   ├── supabase/          # Supabase client setup
│   │   └── utils.ts           # Helper functions
│   └── middleware.ts          # Auth middleware
```

## How the Collaboration Works

Lumina uses Supabase Realtime Channels with two main features:

**Broadcast** - Sends drawing events (mouse movements, strokes) to everyone in the channel. Each drawing action gets broadcasted as a JSON payload with coordinates, color, tool type, etc.

**Presence** - Tracks who's online and their cursor positions. Every user subscribes to the channel and shares their cursor coordinates, which get rendered as colored dots with usernames.

No drawing data touches the database. Everything happens in memory and gets lost when the session ends. The only thing stored in Supabase is user accounts (email, hashed password).

## License

MIT

## Contributing

Pull requests welcome. For major changes, open an issue first.
