#!/bin/bash

# Copy the .env file from the root directory to the server directory
echo "Copying .env file from root directory..."
cp ../.env ./.env

# Rename render-package.json to package.json for deployment
echo "Setting up package.json for Render deployment..."
cp render-package.json package.json.render

echo "Preparation complete! Follow these steps to deploy on Render.com:"
echo "1. Create a new Web Service on Render.com"
echo "2. Connect your GitHub repository"
echo "3. Configure the following settings:"
echo "   - Root Directory: server"
echo "   - Build Command: mv package.json.render package.json && npm install && npm run build"
echo "   - Start Command: npm start"
echo "4. Add all environment variables from your .env file in the Render dashboard"
echo "5. Deploy your application"
