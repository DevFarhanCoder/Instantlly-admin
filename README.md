# InstantllyCards Admin DashboardThis is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).



A comprehensive admin dashboard to monitor and manage your InstantllyCards application.## Getting Started



## FeaturesFirst, run the development server:



✅ **Real-time Statistics**```bash

- Total users, cards, messages, and groupsnpm run dev

- User growth analytics# or

- Active users trackingyarn dev

# or

✅ **User Management**pnpm dev

- View all users with pagination# or

- Search by name, phone, or emailbun dev

- Export all users to CSV```

- Export phone numbers to CSV

- View user statistics (cards, messages, contacts)Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.



✅ **Analytics**You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

- User growth chart (last 30 days)

- Activity monitoringThis project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

- Trend analysis

## Learn More

## Quick Setup

To learn more about Next.js, take a look at the following resources:

### 1. Install Dependencies

```bash- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

npm install- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

```

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

### 2. Configure Environment

Edit `.env.local`:## Deploy on Vercel

```env

NEXT_PUBLIC_API_BASE=https://instantlly-cards-backend.onrender.com/apiThe easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

NEXT_PUBLIC_ADMIN_KEY=your-secure-admin-key-here

```Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


### 3. Update Backend
Add to backend `.env`:
```env
ADMIN_SECRET_KEY=your-secure-admin-key-here
```

### 4. Run
```bash
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel (Free)

1. Push to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add environment variables
4. Deploy!

## CSV Exports

- **Export All Users**: Get complete user data
- **Export Phone Numbers**: Get just names and phone numbers

Perfect for marketing campaigns and user analysis!
