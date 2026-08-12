/**
 * Pricing Service
 * 
 * Server-side price calculation — the single source of truth for print job costs.
 * The frontend may calculate a price for display purposes, but this service
 * determines the authoritative amount charged to the customer.
 * 
 * Rates (INR):
 *   B&W single-sided:  ₹2 per side
 *   B&W double-sided:  ₹3 per sheet (i.e. per 2 pages)
 *   Color:             ₹10 per side
 */

const RATES = {
  BW_SINGLE_PER_SIDE: 2,
  BW_DUPLEX_PER_SHEET: 3,
  COLOR_PER_SIDE: 10,
};

/**
 * Parse a custom page range string (e.g. "1-3, 5, 8-10") into a page count.
 * @param {string} rangeStr - Comma-separated ranges
 * @param {number} totalPages - Total pages in the document
 * @returns {number} Number of pages to print
 */
const parseCustomPageRange = (rangeStr, totalPages) => {
  if (!rangeStr || !rangeStr.trim()) return totalPages;

  let count = 0;
  for (const part of rangeStr.split(',')) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (!isNaN(start) && !isNaN(end) && start <= end && start > 0) {
        count += Math.min(end, totalPages) - start + 1;
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num > 0 && num <= totalPages) {
        count += 1;
      }
    }
  }

  return count > 0 ? count : totalPages;
};

/**
 * Calculate the print cost for a job.
 * @param {Object} settings - { color, duplex, copies, pageRangeType, customRange }
 * @param {Object} document - { pages }
 * @returns {{ cost: number, pagesToPrint: number }}
 */
const calculatePrice = (settings, document) => {
  const totalPages = document.pages || 1;
  const copies = Math.max(1, parseInt(settings.copies, 10) || 1);

  const pagesToPrint = settings.pageRangeType === 'custom'
    ? parseCustomPageRange(settings.customRange, totalPages)
    : totalPages;

  let cost;
  if (settings.color === 'color') {
    cost = pagesToPrint * copies * RATES.COLOR_PER_SIDE;
  } else if (settings.duplex === 'double') {
    cost = Math.ceil(pagesToPrint / 2) * copies * RATES.BW_DUPLEX_PER_SHEET;
  } else {
    cost = pagesToPrint * copies * RATES.BW_SINGLE_PER_SIDE;
  }

  return { cost, pagesToPrint };
};

module.exports = {
  calculatePrice,
  parseCustomPageRange,
  RATES,
};
