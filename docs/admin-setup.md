# Firebase Admin SDK Authentication Setup

This guide explains the complete Firebase Admin SDK authentication system for the KAI platform.

## 🔥 Firebase Admin SDK Implementation

The admin authentication system now uses:
- **Firebase Admin SDK** for server-side token verification (production)
- **Firebase Auth Custom Claims** for storing admin privileges
- **Firestore fallback** for development environments
- **Hybrid authentication** that works in both scenarios

## 🚀 Quick Start

### Current Status
Your admin access is already configured! You can:

1. **Access Admin Panel**: Navigate to `/admin` (redirects to login if needed)
2. **Login**: Use `/admin/login` with your credentials
3. **Dashboard**: Access `/admin/dashboard` once authenticated

### Your Admin Account
- **Email**: tagbajoh@gmail.com
- **Status**: Active (Firestore-based)
- **Access**: Full admin privileges

## 🔧 System Architecture

### Authentication Flow
```
User Login → Firebase Auth → Token Verification → Admin Check → Access Granted
```

### Two-Tier Security
1. **Production**: Firebase Admin SDK with custom claims
2. **Development**: Firestore-based admin records (current)

## 📁 File Structure

```
lib/
├── firebase-admin.ts          # Firebase Admin SDK setup
├── auth/admin-auth.ts         # Hybrid authentication service
hooks/
├── use-admin-auth.tsx         # Client-side admin status hook
app/admin/
├── page.tsx                   # Admin entry point (redirects)
├── login/page.tsx             # Admin login form
├── dashboard/page.tsx         # Main admin dashboard
├── layout.tsx                 # Protected admin layout
├── components/
│   ├── admin-route-guard.tsx  # Route protection component
│   └── ...
scripts/
├── set-admin-user.js          # Firestore admin setup (current)
├── set-admin-claims-simple.js # Firebase Admin SDK setup (production)
```

## 🛠️ Development vs Production

### Current (Development Mode)
- ✅ **Working**: Firestore-based admin records
- ✅ **Secure**: Firebase Auth token validation
- ✅ **Simple**: No service account needed
- ✅ **Flexible**: Easy admin management

### Production Upgrade (Optional)
- 🔥 **Firebase Admin SDK**: Proper server-side verification
- 🔒 **Custom Claims**: Admin status in Firebase Auth
- ⚡ **Performance**: No Firestore queries needed
- 🛡️ **Security**: Production-grade token verification

## 🔐 Admin Access URLs

| URL | Purpose | Authentication |
|-----|---------|----------------|
| `/admin` | Entry point | Redirects to login/dashboard |
| `/admin/login` | Login form | Public (checks auth after login) |
| `/admin/dashboard` | Main dashboard | Protected (requires admin) |
| `/admin/tokens` | User management | Protected (requires admin) |

## 🎯 How to Use

### 1. Access Admin Panel
```
1. Go to /admin
2. If not logged in → redirected to /admin/login
3. Login with your credentials (tagbajoh@gmail.com)
4. If admin → redirected to /admin/dashboard
5. If not admin → access denied
```

### 2. Admin Features
- **User Management**: View all users (email + OAuth)
- **User Sync**: Fix incomplete user profiles
- **Token Issuance**: Grant tokens to users
- **Analytics**: Platform statistics (coming soon)

## 🔧 Production Setup (Optional)

If you want to upgrade to Firebase Admin SDK:

### 1. Get Service Account Key
```bash
# Go to Firebase Console → Project Settings → Service Accounts
# Generate new private key → Download JSON
```

### 2. Set Environment Variables
```bash
# Add to .env.local
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### 3. Set Admin Claims
```bash
# Use the production script
node scripts/set-admin-claims-simple.js set tagbajoh@gmail.com
```

### 4. Verify Setup
```bash
node scripts/set-admin-claims-simple.js list
```

## 🐛 Troubleshooting

### "Access Denied" Error
1. Check admin status: `node scripts/set-admin-user.js list`
2. Verify you're logged in with the correct email
3. Try logging out and back in
4. Check browser console for errors

### "Unauthorized" API Errors
1. Ensure you're logged in
2. Check that auth token is being sent
3. Verify admin status in Firestore
4. Check server logs for details

### Firebase Admin SDK Issues
1. Check environment variables are set
2. Verify service account key format
3. Ensure project ID matches
4. Check Firebase project permissions

## 🔄 Migration Path

### Current → Production
1. **Keep current system** (it works great!)
2. **Or upgrade** when you need:
   - Higher security requirements
   - Better performance at scale
   - Advanced admin features
   - Compliance requirements

### Benefits of Current System
- ✅ Simple setup and maintenance
- ✅ Easy to add/remove admins
- ✅ Visible in Firebase Console
- ✅ No service account management
- ✅ Works perfectly for your use case

## 📞 Support

The current system is production-ready for your needs. The Firebase Admin SDK upgrade is optional and mainly beneficial for:
- Large-scale applications
- High-security requirements
- Advanced user management needs

Your current setup provides excellent security and functionality!