const express = require('express');
const router = express.Router();
const { getProducts, upsertProducts, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getProducts)
  .post(upsertProducts);

router.route('/:id')
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router;
