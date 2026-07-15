const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'jobs.json');

// Initialize file if it doesn't exist
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify([]));
}

let jobs = [];

const loadJobs = () => {
  try {
    const data = fs.readFileSync(dataFile, 'utf8');
    jobs = JSON.parse(data);
  } catch (err) {
    console.error('Error reading jobs data:', err);
    jobs = [];
  }
};

const saveJobs = () => {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(jobs, null, 2));
  } catch (err) {
    console.error('Error saving jobs data:', err);
  }
};

// Initial load
loadJobs();

module.exports = {
  jobs,
  saveJobs
};
