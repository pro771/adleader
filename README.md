# AdLeader - Weekly Ad Watching Competition Platform

A competition-based website where users watch ads to earn placement on a leaderboard. After watching 5 ads, users are eligible to appear on a top 100 leaderboard. The user who watched the most ads is announced as the winner at the end of each week.

## Features

- User authentication system with registration and login
- Ad watching functionality with 30-second timer
- Weekly competition format with automatic resets
- Leaderboard displaying top 100 users
- Real-time countdown timer showing competition end time
- PostgreSQL database for data persistence

## Technology Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express
- Database: PostgreSQL
- ORM: Drizzle
- Authentication: Passport.js
- Styling: Bootstrap 5 + custom CSS

## Setup Instructions

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a PostgreSQL database and set up environment variables:
   - Copy `.env.example` to `.env` and update variables
4. Initialize the database: `node scripts/init-db.js`
5. Start the application: `npm run dev`

## Environment Variables

Create a `.env` file with the following variables:

```
DATABASE_URL=postgresql://username:password@localhost:5432/adleader
SESSION_SECRET=your_session_secret
```

## Screenshots

[Screenshots to be added here]

## License

[MIT License](LICENSE)
