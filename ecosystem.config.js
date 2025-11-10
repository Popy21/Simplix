module.exports = {
  apps: [
    {
      name: 'simplix-api',
      script: 'dist/index.js',
      cwd: '/var/www/simplix/api',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/simplix/error.log',
      out_file: '/var/log/simplix/out.log',
      log_file: '/var/log/simplix/combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
