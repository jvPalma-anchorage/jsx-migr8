#!/data/data/com.termux/files/usr/bin/bash

# Kill any existing processes
echo "Stopping any existing servers..."
pkill -f "tsx" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start API server
echo "Starting API server..."
cd /data/data/com.termux/files/home/jsx-migr8/packages/api
npx tsx src/index.ts &
API_PID=$!
echo "API server PID: $API_PID"

# Wait for API to start
echo "Waiting for API to start..."
for i in {1..10}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "API server is ready!"
    break
  fi
  echo "Waiting... ($i/10)"
  sleep 1
done

# Start web server
echo "Starting web server..."
cd /data/data/com.termux/files/home/jsx-migr8/packages/web
npm run dev &
WEB_PID=$!
echo "Web server PID: $WEB_PID"

echo ""
echo "Servers started!"
echo "API: http://localhost:3000"
echo "Web: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop"

# Wait for both processes
wait $API_PID $WEB_PID