# Deployment Guide - DrugFree India

This guide will help you deploy the DrugFree India application to various cloud platforms.

## 🚀 Quick Deployment Options

### Option 1: Render (Recommended - Free Tier)

1. **Prepare Your Repository**
   - Push your code to GitHub
   - Ensure all files are committed

2. **Deploy on Render**
   - Go to [render.com](https://render.com) and sign up
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - **Name**: `drugfree-india`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment**: `Node`

3. **Set Environment Variables**
   - Go to Environment tab
   - Add the following variables:
     ```
     MONGODB_URI=your-mongodb-connection-string
     NODE_ENV=production
     PORT=3000
     ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Your app will be available at `https://your-app-name.onrender.com`

### Option 2: Railway

1. **Deploy on Railway**
   - Go to [railway.app](https://railway.app) and sign up
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js

2. **Set Environment Variables**
   - Go to Variables tab
   - Add:
     ```
     MONGODB_URI=your-mongodb-connection-string
     NODE_ENV=production
     ```

3. **Deploy**
   - Railway will automatically deploy
   - Get your URL from the Deployments tab

### Option 3: Fly.io

1. **Install Fly CLI**
   ```bash
   # macOS
   brew install flyctl
   
   # Windows
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   
   # Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login and Deploy**
   ```bash
   fly auth login
   fly launch
   ```

3. **Set Environment Variables**
   ```bash
   fly secrets set MONGODB_URI="your-mongodb-connection-string"
   fly secrets set NODE_ENV="production"
   ```

4. **Deploy**
   ```bash
   fly deploy
   ```

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

1. **Create MongoDB Atlas Account**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Sign up for free account

2. **Create Cluster**
   - Click "Build a Database"
   - Choose "FREE" tier
   - Select cloud provider and region
   - Click "Create"

3. **Set Up Database Access**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Create username and password
   - Select "Read and write to any database"
   - Click "Add User"

4. **Set Up Network Access**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for production)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database"
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password

### Local MongoDB (Development Only)

1. **Install MongoDB**
   ```bash
   # macOS
   brew install mongodb-community
   
   # Ubuntu
   sudo apt-get install mongodb
   
   # Windows
   # Download from mongodb.com
   ```

2. **Start MongoDB**
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Ubuntu
   sudo systemctl start mongodb
   
   # Windows
   # Start MongoDB service
   ```

## 🔧 Environment Configuration

### Development (.env file)
```bash
MONGODB_URI=mongodb://localhost:27017/drugfree-india
PORT=3000
NODE_ENV=development
```

### Production
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/drugfree-india
PORT=3000
NODE_ENV=production
```

## 📱 Mobile Testing

### HTTPS Setup (Required for Camera)

1. **Using ngrok (Development)**
   ```bash
   npm install -g ngrok
   npm run dev
   # In another terminal:
   ngrok http 3000
   ```

2. **Production HTTPS**
   - Most cloud platforms provide HTTPS automatically
   - For custom domains, use Let's Encrypt

### Mobile Testing Checklist
- [ ] Camera access works
- [ ] GPS location works
- [ ] Form submission works
- [ ] Map loads correctly
- [ ] Responsive design looks good

## 🔒 Security Considerations

### Production Checklist
- [ ] Use HTTPS
- [ ] Set up proper CORS
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Set up monitoring
- [ ] Regular backups

### Recommended Additions
```javascript
// Add to server.js for production
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

## 📊 Monitoring & Analytics

### Basic Monitoring
- Set up error logging (e.g., Sentry)
- Monitor response times
- Track API usage
- Set up alerts for downtime

### Analytics
- Track report submissions
- Monitor geographic distribution
- Analyze peak usage times
- Track user engagement

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check connection string
   - Verify network access
   - Check credentials

2. **Image Upload Fails**
   - Check file size limits
   - Verify uploads directory exists
   - Check file permissions

3. **GPS Not Working**
   - Ensure HTTPS is enabled
   - Check browser permissions
   - Test on actual device

4. **Map Not Loading**
   - Check internet connection
   - Verify Leaflet.js is loaded
   - Check console for errors

### Debug Commands
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check MongoDB connection
mongo --eval "db.runCommand('ping')"

# Check port availability
netstat -an | grep 3000
```

## 📈 Scaling Considerations

### When to Scale
- 1000+ daily reports
- 100+ concurrent users
- Response times > 2 seconds

### Scaling Options
1. **Vertical Scaling**: Upgrade server resources
2. **Horizontal Scaling**: Add more servers
3. **Database Scaling**: Use MongoDB Atlas M10+ or sharding
4. **CDN**: Use CloudFlare for static assets

## 🔄 Continuous Deployment

### GitHub Actions Example
```yaml
name: Deploy to Render
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to Render
      env:
        RENDER_TOKEN: ${{ secrets.RENDER_TOKEN }}
        RENDER_SERVICE_ID: ${{ secrets.RENDER_SERVICE_ID }}
      run: |
        curl -X POST "https://api.render.com/deploy/srv/$RENDER_SERVICE_ID?key=$RENDER_TOKEN"
```

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review the logs
3. Create an issue on GitHub
4. Contact the development team

---

**Happy Deploying! 🚀** 