# AI Detector Web (Full)

This project is a Next.js demo of an AI Detector & Remediation app with OpenAI-powered endpoints for text detection and humanization.

## Quick start (local)
1. Create a file `.env.local` in the project root with:

   ```
   OPENAI_API_KEY=sk-...
   ```

2. Install:
   ```
   npm install
   ```
3. Run:
   ```
   npm run dev
   ```
4. Open http://localhost:3000

## Deploy
Push this repo to GitHub and import to Vercel. Add `OPENAI_API_KEY` to Vercel Environment Variables and redeploy.

## Notes
- The image and document endpoints are stubs; replace them with your preferred models/services for production.
- Never commit your API keys to the repo.
