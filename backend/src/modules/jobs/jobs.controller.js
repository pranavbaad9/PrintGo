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
    
    // IDOR protection: session-authenticated users can only access jobs 
    // that belong to their session's machine (or jobs with no machine set)
    if (req.session && job.machineId && req.session.machineId && job.machineId !== req.session.machineId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
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
    const job = await jobsService.createJob(req.body);
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
