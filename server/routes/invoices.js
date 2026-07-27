const express = require('express');
const router = express.Router();
const { getInvoices, upsertInvoices, deleteInvoice } = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getInvoices)
  .post(upsertInvoices);

router.route('/:id')
  .delete(deleteInvoice);

module.exports = router;
