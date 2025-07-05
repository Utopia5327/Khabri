# Deployment Guide for DrugFree India

This guide will help you deploy the DrugFree India application to Render.com.

## Prerequisites

1. **GitHub Repository**: Your code should be pushed to a GitHub repository
2. **MongoDB Atlas Account**: For production database
3. **Google Cloud Platform Account**: For file storage
4. **Render.com Account**: For hosting

## Step 1: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account or sign in
3. Create a new cluster (M0 Free tier is sufficient)
4. Create a database user with read/write permissions
5. Get your connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/drugfree-india
   ```

## Step 2: Set Up Google Cloud Storage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Cloud Storage API
4. Create a storage bucket named `drugfree-india-uploads`
5. Make the bucket public (for image access)
6. Create a service account and download the JSON key file
7. Rename the downloaded file to `google-cloud-key.json`

## Step 3: Deploy to Render.com

### Option A: Using render.yaml (Recommended)

1. **Push your code to GitHub** with the `render.yaml` file
2. Go to [Render.com](https://render.com) and sign up/login
3. Click "New +" and select "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect the `render.yaml` configuration
6. Click "Apply" to deploy

### Option B: Manual Setup

1. Go to [Render.com](https://render.com) and sign up/login
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `drugfree-india`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Starter` (Free tier)

## Step 4: Configure Environment Variables

In your Render dashboard, go to your service and add these environment variables:

### Required Variables:
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/drugfree-india
GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id
GOOGLE_CLOUD_BUCKET_NAME=drugfree-india-uploads
```

### Google Cloud Key Setup:
1. In your Render service dashboard, go to "Files" tab
2. Upload your `google-cloud-key.json` file
3. Set the environment variable:
   ```
   GOOGLE_CLOUD_KEY_FILE=google-cloud-key.json
   ```

## Step 5: Deploy and Test

1. Click "Deploy" in Render
2. Wait for the build to complete (usually 2-5 minutes)
3. Your app will be available at: `https://your-app-name.onrender.com`
4. Test the application:
   - Submit a new report
   - Check if images are uploaded to Google Cloud Storage
   - Verify reports appear on the map

## Step 6: Custom Domain (Optional)

1. In your Render service dashboard, go to "Settings"
2. Click "Custom Domains"
3. Add your domain and follow the DNS configuration instructions

## Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check that all dependencies are in `package.json`
   - Verify the start command is correct

2. **Database Connection Error**:
   - Ensure MongoDB Atlas IP whitelist includes `0.0.0.0/0`
   - Check connection string format

3. **Google Cloud Storage Error**:
   - Verify the service account has proper permissions
   - Check that the key file is uploaded correctly

4. **Images Not Loading**:
   - Ensure the Google Cloud bucket is public
   - Check CORS settings if needed

### Logs and Debugging:

1. In Render dashboard, go to "Logs" tab
2. Check for error messages during deployment
3. Monitor application logs for runtime errors

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **MongoDB**: Use strong passwords and enable authentication
3. **Google Cloud**: Use least-privilege service accounts
4. **HTTPS**: Render provides SSL certificates automatically

## Monitoring and Maintenance

1. **Health Checks**: Render automatically monitors your service
2. **Auto-scaling**: Configure based on your needs
3. **Backups**: Set up regular MongoDB Atlas backups
4. **Updates**: Keep dependencies updated regularly

## Cost Optimization

1. **Free Tier**: Render offers 750 hours/month free
2. **MongoDB Atlas**: 512MB free tier available
3. **Google Cloud**: First 5GB storage free monthly

## Support

- **Render Documentation**: https://render.com/docs
- **MongoDB Atlas Documentation**: https://docs.atlas.mongodb.com/
- **Google Cloud Documentation**: https://cloud.google.com/docs

---

Your DrugFree India application should now be live and accessible to the public! 🎉 