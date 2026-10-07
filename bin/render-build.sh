#!/usr/bin/env bash
# Render build: builds the Angular app, copies it to where Rails serves static
# files, installs the gems and creates the database indexes.
set -o errexit

echo "Node $(node --version), Ruby $(ruby --version)"

cd frontend
npm ci
npm run build
cd ..

rm -rf backend/public
mkdir -p backend/public
cp -R frontend/dist/frontend/browser/. backend/public/

cd backend
bundle install
bin/rails db:mongoid:create_indexes
