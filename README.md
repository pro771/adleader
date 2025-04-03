# Ad Watching Competition Platform

A web-based competition platform where users can watch ads to earn placement on a leaderboard. After watching 5 ads, users are eligible to appear on the top 100 leaderboard. The user who watched the most ads is announced as the winner at the end of each week.

## Features

- User authentication system with registration and login
- Weekly competition format with real-time countdown timer
- Ad viewing system with 30-second timer
- Top 100 leaderboard tracking user participation
- Responsive design for desktop and mobile devices
- PostgreSQL database for data persistence
- AdQuake integration for ad monetization

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Bootstrap
- Backend: Node.js, Express
- Database: PostgreSQL
- ORM: Drizzle
- Authentication: Passport.js with session-based auth

## Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up PostgreSQL database and update connection string in environment variables
4. Run database migrations with `npm run db:push`
5. Start the server with `npm run dev`

## Environment Variables

The following environment variables are required:

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `ADQUAKE_PUBLISHER_ID`: Your AdQuake Publisher ID (for ad monetization)

## Domain Verification

For AdQuake integration, add the following meta tag to your website:

```html
<meta name="_adquake_domain_verification" content="YOUR_VERIFICATION_CODE">
```

## License

[MIT](LICENSE)