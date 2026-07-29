const subscriptionsService = require('./subscriptions.service');

const getSubscriptions = async (req, res, next) => {
  try {
    const { machineId } = req.query;
    const subscriptions = await subscriptionsService.getSubscriptions(machineId);
    res.json({ success: true, subscriptions });
  } catch (error) {
    next(error);
  }
};

const createSubscription = async (req, res, next) => {
  try {
    const subscription = await subscriptionsService.createSubscription(req.body);
    res.json({ success: true, subscription });
  } catch (error) {
    next(error);
  }
};

const cancelSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subscription = await subscriptionsService.cancelSubscription(id, req.app.get('io'));
    res.json({ success: true, subscription });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubscriptions,
  createSubscription,
  cancelSubscription
};
