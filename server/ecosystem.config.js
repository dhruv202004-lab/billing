module.exports = {
  apps: [
    {
      name: 'billing-api',
      script: 'server.js',
      cwd: __dirname,

      // Restart policy
      watch: false,           // don't restart on file changes in production
      autorestart: true,      // restart automatically if it crashes
      max_restarts: 10,       // give up after 10 rapid crashes
      restart_delay: 3000,    // wait 3s between restart attempts

      // Environment
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // Log files (relative to server directory)
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
