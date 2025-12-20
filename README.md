# InstantllyCards Admin Dashboard

A comprehensive admin dashboard to monitor and manage your InstantllyCards application, built with Next.js.

## 🌟 Features

✅ **Real-time Statistics**
- Total users, cards, messages, and groups
- User growth analytics
- Active users tracking

✅ **User Management**
- View all users with pagination
- Search by name, phone, or email
- Export all users to CSV
- Export phone numbers to CSV
- View user statistics (cards, messages, contacts)

✅ **Referral System Management** 🎁
- Configure signup bonus credits (Self Download)
- Configure referral reward credits (Introducer)
- Real-time updates to mobile app
- Preview credit changes before applying

✅ **Analytics**
- User growth chart (last 30 days)
- Activity monitoring
- Trend analysis

## 🚀 Deployment Options

### Local Development
Backend: `http://localhost:8080`  
Admin Panel: `http://localhost:3000`

### Staging Environment
Backend: `https://api-test.instantllycards.com`  
Admin Panel: Deploy to Vercel staging

### Production Environment
Backend: `https://api.instantllycards.com`  
Admin Panel: Deploy to Vercel production

## 📋 Quick Start - Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   
   File: `.env.local`
   ```env
   NEXT_PUBLIC_API_BASE=http://localhost:8080
   NEXT_PUBLIC_ADMIN_KEY=Farhan_90
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   
   Navigate to: http://localhost:3000

## 🌐 Deploy to Staging

**See:** [STAGING_DEPLOYMENT_GUIDE.md](./STAGING_DEPLOYMENT_GUIDE.md) for complete instructions

**Quick Deploy:**
```powershell
# Run the deployment script
.\deploy-staging.ps1
```

**Or manually:**
```bash
# Install Vercel CLI (first time only)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**Configure Environment Variables in Vercel:**
- `NEXT_PUBLIC_API_BASE`: `https://api-test.instantllycards.com`
- `NEXT_PUBLIC_ADMIN_KEY`: `Farhan_90`

## 📱 Update Mobile App for Staging

After deploying admin to staging, update mobile app:

File: `InstantllyCards/.env`
```env
EXPO_PUBLIC_API_BASE=https://api-test.instantllycards.com
```

Then rebuild the mobile app.

## 🎁 Referral System

The referral system allows you to control credit rewards:

- **Self Download (Signup Bonus)**: Credits given to new users when they sign up
- **Introducer (Referral Reward)**: Credits given to existing users when their referral code is used

Changes made in the admin panel are immediately reflected in:
- Mobile app signup page
- Referral details page
- Share messages
- Backend credit calculations

## 📊 CSV Exports

- **Export All Users**: Complete user data with statistics
- **Export Phone Numbers**: Names and phone numbers for campaigns

## 🔐 Admin Authentication

Login with your admin credentials. The admin key must match the backend's `ADMIN_SECRET_KEY`.

## 📚 Documentation

- [STAGING_DEPLOYMENT_GUIDE.md](./STAGING_DEPLOYMENT_GUIDE.md) - Complete staging deployment guide
- [REFERRAL_SYSTEM_IMPLEMENTATION.md](./REFERRAL_SYSTEM_IMPLEMENTATION.md) - Referral system details
- [RENDER_COLD_START_FIX.md](./RENDER_COLD_START_FIX.md) - Backend wake-up handling

## 🛠️ Development Scripts

```bash
# Run local development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## 🔧 Troubleshooting

### Can't connect to backend
- Verify backend URL in environment variables
- Check if backend is running: `curl <backend-url>/health`
- Review browser console for CORS errors

### Unauthorized errors
- Ensure `NEXT_PUBLIC_ADMIN_KEY` matches backend's `ADMIN_SECRET_KEY`
- Check admin credentials are correct

### Changes not reflecting
- Clear browser cache
- Check environment variables are set correctly
- Verify backend received the update

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review relevant documentation files
3. Check backend and Vercel logs

---

Built with ❤️ using Next.js 15
