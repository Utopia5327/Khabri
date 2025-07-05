# 🚀 Deployment Checklist for DrugFree India

## Pre-Deployment Setup

### ✅ GitHub Repository
- [ ] Code is pushed to GitHub
- [ ] All files are committed
- [ ] `render.yaml` is included
- [ ] `package.json` has correct scripts

### ✅ MongoDB Atlas
- [ ] Account created at [mongodb.com/atlas](https://mongodb.com/atlas)
- [ ] Free cluster created (M0 tier)
- [ ] Database user created with read/write permissions
- [ ] Network access set to "Allow Access from Anywhere" (0.0.0.0/0)
- [ ] Connection string copied

### ✅ Google Cloud Storage
- [ ] Project created at [console.cloud.google.com](https://console.cloud.google.com)
- [ ] Cloud Storage API enabled
- [ ] Bucket `drugfree-india-uploads` created
- [ ] Bucket made public
- [ ] Service account created
- [ ] JSON key file downloaded as `google-cloud-key.json`

## Render.com Deployment

### ✅ Create Web Service
- [ ] Go to [render.com](https://render.com)
- [ ] Sign up/login
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repository
- [ ] Configure service settings

### ✅ Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `PORT=10000`
- [ ] `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/drugfree-india`
- [ ] `GOOGLE_CLOUD_PROJECT_ID=your-project-id`
- [ ] `GOOGLE_CLOUD_BUCKET_NAME=drugfree-india-uploads`

### ✅ Google Cloud Key File
- [ ] Go to "Files" tab in Render dashboard
- [ ] Upload `google-cloud-key.json`
- [ ] Set `GOOGLE_CLOUD_KEY_FILE=google-cloud-key.json`

### ✅ Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Check deployment logs for errors

## Post-Deployment Testing

### ✅ Application Testing
- [ ] Visit your app URL: `https://your-app-name.onrender.com`
- [ ] Test report submission with photo
- [ ] Verify image uploads to Google Cloud Storage
- [ ] Check reports appear on map
- [ ] Test mobile responsiveness

### ✅ Database Testing
- [ ] Check MongoDB Atlas for new reports
- [ ] Verify data is being stored correctly
- [ ] Test map loading with multiple reports

### ✅ Storage Testing
- [ ] Check Google Cloud Storage for uploaded images
- [ ] Verify images are publicly accessible
- [ ] Test image loading in reports

## Monitoring & Maintenance

### ✅ Set Up Monitoring
- [ ] Check Render logs for errors
- [ ] Monitor MongoDB Atlas usage
- [ ] Track Google Cloud Storage usage
- [ ] Set up alerts if needed

### ✅ Security Review
- [ ] Environment variables are secure
- [ ] No sensitive data in code
- [ ] HTTPS is working
- [ ] CORS is properly configured

## Quick Commands

```bash
# Check deployment status
curl -I https://your-app-name.onrender.com

# Test API endpoint
curl https://your-app-name.onrender.com/api/reports

# Check MongoDB connection (replace with your URI)
mongosh "mongodb+srv://username:password@cluster.mongodb.net/drugfree-india"
```

## Troubleshooting

### Common Issues:
1. **Build fails**: Check `package.json` and dependencies
2. **Database connection**: Verify MongoDB Atlas settings
3. **Image upload fails**: Check Google Cloud permissions
4. **Map not loading**: Verify all static files are served

### Useful Links:
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Google Cloud Docs](https://cloud.google.com/docs)

---

**🎉 Your DrugFree India app should now be live and accessible to the public!** 