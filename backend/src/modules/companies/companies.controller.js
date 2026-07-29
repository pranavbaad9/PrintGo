const companiesService = require('./companies.service');

const getCompanies = async (req, res, next) => {
  try {
    const companies = await companiesService.getCompanies();
    res.json({ success: true, companies });
  } catch (error) {
    next(error);
  }
};

const createCompany = async (req, res, next) => {
  try {
    const result = await companiesService.createCompany(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  createCompany
};
