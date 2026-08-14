/**
 * PrintGo State Machines
 * 
 * Defines allowed status transitions for PrintJobs and Payments.
 * Prevents invalid state changes (e.g., COMPLETED → PENDING_PAYMENT).
 */

const logger = require('./logger');

// ============================================================
// Print Job State Machine
// ============================================================
//
//  PENDING_PAYMENT ──► WAITING ──► PRINTING ──► COMPLETED
//       │                │            │
//       ▼                ▼            ▼
//    CANCELLED       CANCELLED     FAILED
//                                    │
//                                    ▼
//                                CANCELLED
//
const PRINT_JOB_TRANSITIONS = {
  'PENDING_PAYMENT': ['WAITING', 'CANCELLED'],
  'WAITING':         ['PRINTING', 'CANCELLED'],
  'PRINTING':        ['COMPLETED', 'FAILED'],
  'COMPLETED':       [],  // Terminal state
  'FAILED':          ['CANCELLED'],  // Can be cancelled for refund processing
  'CANCELLED':       [],  // Terminal state
};

// ============================================================
// Payment State Machine
// ============================================================
//
//  PENDING ──► SUCCESS ──► REFUNDED
//     │
//     ▼
//   FAILED
//     │
//     ▼
//   EXPIRED
//
const PAYMENT_TRANSITIONS = {
  'PENDING':   ['SUCCESS', 'FAILED'],
  'SUCCESS':   ['REFUNDED'],
  'FAILED':    ['EXPIRED'],
  'REFUNDED':  [],  // Terminal state
  'EXPIRED':   [],  // Terminal state
};

/**
 * Validates whether a status transition is allowed.
 * @param {Object} transitions - The state machine definition
 * @param {string} entityType - Name for logging (e.g., 'PrintJob', 'Payment')
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - Desired new status
 * @returns {boolean} Whether the transition is allowed
 */
const isValidTransition = (transitions, entityType, currentStatus, newStatus) => {
  const allowed = transitions[currentStatus];
  
  if (!allowed) {
    logger.warn(`${entityType}: Unknown current status "${currentStatus}"`);
    return false;
  }
  
  if (!allowed.includes(newStatus)) {
    logger.warn(`${entityType}: Invalid transition "${currentStatus}" → "${newStatus}". Allowed: [${allowed.join(', ')}]`);
    return false;
  }
  
  return true;
};

/**
 * Validate a PrintJob status transition.
 */
const isValidJobTransition = (currentStatus, newStatus) => {
  return isValidTransition(PRINT_JOB_TRANSITIONS, 'PrintJob', currentStatus, newStatus);
};

/**
 * Validate a Payment status transition.
 */
const isValidPaymentTransition = (currentStatus, newStatus) => {
  return isValidTransition(PAYMENT_TRANSITIONS, 'Payment', currentStatus, newStatus);
};

/**
 * All valid PrintJob statuses.
 */
const JOB_STATUSES = Object.keys(PRINT_JOB_TRANSITIONS);

/**
 * All valid Payment statuses.
 */
const PAYMENT_STATUSES = Object.keys(PAYMENT_TRANSITIONS);

module.exports = {
  PRINT_JOB_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  isValidJobTransition,
  isValidPaymentTransition,
  JOB_STATUSES,
  PAYMENT_STATUSES,
};
