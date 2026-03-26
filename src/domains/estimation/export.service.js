const path = require('path');

/**
 * Export Service — stubs for Excel / PDF generation.
 * Real implementation will use: exceljs (Excel) + pdfkit or puppeteer (PDF).
 * Wire these up once the core logic is stable.
 */

exports.generateExcel = async (id) => {
  const error = new Error('Excel export not implemented yet');
  error.statusCode = 501;
  throw error;
};

exports.generatePDF = async (id) => {
  const error = new Error('PDF export not implemented yet');
  error.statusCode = 501;
  throw error;
};
