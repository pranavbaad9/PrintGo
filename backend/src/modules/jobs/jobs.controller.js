const jobsService = require('./jobs.service');

const getAllJobs = async (req, res, next) => {
  try {
    const jobs = await jobsService.getAllJobs(req.user);
    res.json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
};

const getJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await jobsService.getJobByShortId(id, req.user);
    
    // STRICT IDOR PROTECTION:
    if (req.session) {
      // If the session has a machineId, it can ONLY access jobs for that exact machine.
      if (req.session.machineId) {
        if (job.machineId !== req.session.machineId) {
          return res.status(403).json({ success: false, error: 'Access denied: Job belongs to a different machine' });
        }
      } else {
        // If the session has NO machineId, it can ONLY access jobs that also have NO machineId.
        // It MUST NOT be allowed to access any job assigned to an actual machine!
        if (job.machineId !== null) {
          return res.status(403).json({ success: false, error: 'Access denied: Cannot access machine-assigned jobs without a machine session' });
        }
      }
    }
    
    // eta calculation can be added here or in service
    res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

const createJob = async (req, res, next) => {
  try {
    // In actual implementation, we'd validate req.body with Zod here
    const jobData = { ...req.body };
    if (req.session && req.session.machineId) {
      jobData.machineId = req.session.machineId;
    }
    const job = await jobsService.createJob(jobData);
    res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

const updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    
    const job = await jobsService.updateJobStatus(id, status, req.user);
    req.app.get('io').emit('job_status_changed', job);
    res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

const exportJobsCsv = async (req, res, next) => {
  try {
    const jobs = await jobsService.getAllJobs(req.user);
    
    // Build CSV Header
    let csv = 'Job ID,Date,Status,Machine,Customer,Document,Pages,Color,Duplex,Cost (INR)\n';
    
    // Build CSV Rows
    jobs.forEach(job => {
      const date = new Date(job.createdAt).toISOString();
      const machineName = job.machine ? `"${job.machine.name}"` : 'Unassigned';
      const customerStr = job.customer ? `"${job.customer.phone || job.customer.email}"` : 'Walk-in';
      const docName = job.document ? `"${job.document.originalName}"` : 'Unknown';
      
      csv += `${job.shortId},${date},${job.status},${machineName},${customerStr},${docName},${job.pagesToPrint},${job.color},${job.duplex},${job.cost}\n`;
    });
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`printgo_jobs_${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllJobs,
  getJob,
  createJob,
  updateJobStatus,
  exportJobsCsv
};
