# Esteban Aguilar - Portfolio

## About

Academic portfolio showcasing my journey in Computer Science Engineering at Hillsborough Community College.

## Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Final Floor (game project)

The site also hosts **Final Floor: A Crawl Fantasy** at `/game`: a 16-bit style JRPG/ARPG where a seed procedurally generates the story, dungeon floors, monsters and music. It's written in TypeScript on an HTML canvas with no external assets. See [`src/game/README.md`](src/game/README.md) for how it plays and how the code is organized.

## Development

To run this project locally:

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Copy environment variables (optional - only needed if using backend features)
cp .env.example .env

# Start the development server
npm run dev
```

The project will run on `http://localhost:8080`

## Deployment

### Deploy to Netlify

1. **Push your code to GitHub** (if you haven't already)

2. **Connect to Netlify**:
   - Go to [Netlify](https://www.netlify.com/) and sign up or log in
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository

3. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18 or higher

4. **Add environment variables** (if using backend features):
   - Go to Site settings → Environment variables
   - Add `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_URL` with your values

5. **Deploy**:
   - Click "Deploy site"
   - Your site will be live at a Netlify URL (you can add a custom domain later)

### Other Hosting Options

This project can also be deployed to Vercel, GitHub Pages, or any static hosting service that supports React applications.
