# Telegram Auth MVP Frontend

> Полный runbook (local + Oracle Cloud) см. в корневом [`../README.md`](../README.md).

Frontend implementation for Telegram Auth using React, Vite, and TypeScript.

## Prerequisites
- Node.js 18+

## Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy `.env.example` to `.env` and fill in necessary fields.
   ```bash
   cp .env.example .env
   ```
   Variables:
   - `VITE_API_URL` - Backend API base URL (e.g., `http://localhost:8080`)
   - `VITE_TELEGRAM_BOT_NAME` - The username of your Telegram Bot for the Login Widget

3. **Running in Development**
   ```bash
   npm run dev
   ```

4. **Building for Production**
   ```bash
   npm run build
   ```

## Architecture Notes
- Authentication state is stored entirely in memory inside `AuthContext`.
- We rely strictly on cookie-based authentication returning from the backend. The API Client sets `withCredentials: true`.
- Dynamic redirects operate on the user's `status` returning from the profile endpoint.
