const express = require('express');
const router = express.Router();
const machinesController = require('./machines.controller');
const { protect, restrictTo, protectMachine } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { createMachineSchema, updateMachineSchema } = require('../../utils/schemas');

router.get('/', protect, restrictTo('SUPERADMIN'), machinesController.getMachines);
router.post('/', protect, restrictTo('SUPERADMIN'), validate(createMachineSchema), machinesController.createMachine);
router.put('/:id', protect, restrictTo('SUPERADMIN'), validate(updateMachineSchema), machinesController.updateMachine);

router.get('/my-machines', protect, restrictTo('FRANCHISEE', 'STAFF'), machinesController.getMyMachines);
router.get('/agent-version', protectMachine, machinesController.getAgentVersion); // Protected OTA updater endpoint

router.get('/:id/public-key', machinesController.getPublicKey);

module.exports = router;
