const express = require('express');
const router = express.Router();
const machinesController = require('./machines.controller');
const { protect, restrictTo } = require('../../middlewares/auth');

router.get('/', protect, restrictTo('SUPERADMIN'), machinesController.getMachines);
router.post('/', protect, restrictTo('SUPERADMIN'), machinesController.createMachine);
router.put('/:id', protect, restrictTo('SUPERADMIN'), machinesController.updateMachine);

router.get('/my-machines', protect, restrictTo('FRANCHISEE', 'STAFF'), machinesController.getMyMachines);

module.exports = router;
