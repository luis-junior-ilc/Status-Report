const path = require('path');
const fs = require('fs');

const serverEnv = path.join(__dirname, '.env');
const rootEnv = path.join(__dirname, '../.env');

if (fs.existsSync(serverEnv)) {
  require('dotenv').config({ path: serverEnv });
} else if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else {
  require('dotenv').config();
}

module.exports = {
  port: process.env.PORT || 3000,
  azureDevOps: {
    orgUrl: process.env.AZURE_DEVOPS_ORG_URL || 'https://projetosmirassol1.visualstudio.com',
    pat: process.env.AZURE_DEVOPS_PAT || ''
  },
  syncIntervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '30', 10),
  adminPin: process.env.ADMIN_PIN || (process.env.NODE_ENV === 'production' ? '' : 'admin')
};
