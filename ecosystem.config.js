# PM2 Ecosystem Configuration for Production
module.exports = {
  apps: [{
    name: 'rsspl-dashboard',
    script: 'npm',
    args: 'start',
    cwd: process.cwd(),
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
}
