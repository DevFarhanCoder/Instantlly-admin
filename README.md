# InstantllyCards Admin Dashboard

A comprehensive admin dashboard to monitor and manage your InstantllyCards application, built with **Next.js 15** + TypeScript + Tailwind CSS.

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

✅ **N-Level Category Manager** 🗂️
- Unlimited hierarchy: Main → Sub → Sub-Sub → …
- Breadcrumb navigator — drill into any depth
- Add / Edit / Delete categories at every level
- Enable / Disable individual nodes
- CSV upload (business listings) attached to **any** node
- Custom service request review (approve / reject)
- Auto-seeds 11 default root categories via Seed button

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

## 📋 Quick Start — Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**

   Create `.env.local`:
   ```env
   NEXT_PUBLIC_API_BASE=http://localhost:8080
   NEXT_PUBLIC_ADMIN_KEY=Farhan_90
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser** → [http://localhost:3000](http://localhost:3000)

## 🗂️ Category Manager — How It Works

The Category Manager at `/categories` supports **unlimited nesting** (N-level hierarchy).

### Data Flow
```
Admin Panel ──► POST /api/categories/admin/node ──► MongoDB
                                                        │
Mobile App ◄── GET  /api/categories/tree        ◄──────┘
```

### Admin UI
| Action | How |
|---|---|
| Add root category | Click **"New Main Category"** footer button or header button |
| Add sub-category | Select a node → click **"Add Sub Category"** card |
| Drill into children | Select a node → click **"Browse Sub-categories"** |
| Breadcrumb nav | Click any crumb in the top breadcrumb bar |
| Edit name / icon | Hover row → click ✏️ pencil icon |
| Enable / Disable | Hover row → click 👁 eye icon |
| Delete (+ all descendants) | Hover row → click 🗑 trash icon |
| Upload CSV | Select node → click **"Upload CSV"** card, drag-drop or browse |

### CSV Upload Format
Required columns: `businessName*`, `phone*`  
Optional: `ownerName`, `description`, `whatsapp`, `email`, `website`, `area`, `city`, `state`, `pincode`, `landmark`, `listingType` (`free` or `promoted`)

### Backend API Routes (new)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/categories/tree` | Public full nested tree |
| `GET` | `/api/categories/tree/admin` | Admin tree (includes inactive) |
| `GET` | `/api/categories/:id/children` | Direct children of a node |
| `POST` | `/api/categories/admin/node` | Create node at any level |
| `PUT` | `/api/categories/admin/node/:id` | Update name / icon / isActive |
| `DELETE` | `/api/categories/admin/node/:id` | Delete node + all descendants |
| `POST` | `/api/categories/admin/node/:id/upload-csv` | Upload business listings CSV |

## 🌐 Deploy to Staging

**See:** [STAGING_DEPLOYMENT_GUIDE.md](./STAGING_DEPLOYMENT_GUIDE.md) for complete instructions

**Quick Deploy:**
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

| File | Description |
|---|---|
| [STAGING_DEPLOYMENT_GUIDE.md](./STAGING_DEPLOYMENT_GUIDE.md) | Complete staging deployment guide |
| [REFERRAL_SYSTEM_IMPLEMENTATION.md](./REFERRAL_SYSTEM_IMPLEMENTATION.md) | Referral system details |
| [RENDER_COLD_START_FIX.md](./RENDER_COLD_START_FIX.md) | Backend wake-up handling |

## 🛠️ Development Scripts

```bash
npm run dev          # Start local dev server (Turbopack)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Lint with ESLint
npm run deploy:staging    # Deploy to Vercel staging
npm run deploy:production # Deploy to Vercel production
```

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| Can't connect to backend | Verify `NEXT_PUBLIC_API_BASE` in `.env.local`; run `curl <backend-url>/health` |
| Unauthorized errors | Ensure `NEXT_PUBLIC_ADMIN_KEY` matches backend's `ADMIN_SECRET_KEY` |
| Changes not reflecting | Clear browser cache; verify env vars are set; check backend logs |
| Category tree empty | Click **"Seed Defaults"** to populate 11 root categories from backend |

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review relevant documentation files
3. Check backend and Vercel logs

---

Built with ❤️ using Next.js 15 · TypeScript · Tailwind CSS · Lucide React
