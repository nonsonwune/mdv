#!/bin/bash

# Push to GitHub script
# Run this after setting up GitHub authentication

echo "Pushing MDV repository to GitHub..."

# Ensure we're in the right directory
cd /Users/mac/Repository/mdv

# Check if remote exists
if ! git remote | grep -q "origin"; then
    echo "Adding remote origin..."
    git remote add origin https://github.com/nonsonwune/mdv.git
fi

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 View your repository at: https://github.com/nonsonwune/mdv"
else
    echo "❌ Push failed. Please ensure you're authenticated with GitHub."
    echo ""
    echo "Options to authenticate:"
    echo "1. Install GitHub CLI: brew install gh && gh auth login"
    echo "2. Use a Personal Access Token from GitHub Settings"
    echo "3. Set up SSH keys and change remote to: git@github.com:nonsonwune/mdv.git"
fi
