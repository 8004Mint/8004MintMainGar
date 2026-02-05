// PM2 config: run pm2 start ecosystem.config.cjs from /opt/8004 on server
// Requires .env and frontend/dist, mcp/dist to exist

module.exports = {
  apps: [
    {
      name: "8004-backend",
      cwd: "/opt/8004",
      script: "npx",
      args: "ts-node backend/src/server.ts",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "8004-mcp",
      cwd: "/opt/8004/mcp",
      script: "node",
      args: "dist/http.js",
      env: {
        NODE_ENV: "production",
        BACKEND_URL: "https://8004mint.com",
      },
    },
  ],
};
