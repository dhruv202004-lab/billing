const Customer = require('../models/Customer');

// Get all customers (with optional sync support)
exports.getCustomers = async (req, res) => {
  try {
    const { lastSyncedAt } = req.query;
    let query = { userId: req.user.id };

    if (lastSyncedAt) {
      query.updatedAt = { $gt: new Date(lastSyncedAt) };
    }

    const customers = await Customer.find(query);
    res.json(customers);
  } catch (error) {
    console.error('getCustomers error:', error);
    res.status(500).json({ message: error.message || 'Error fetching customers' });
  }
};

// Create or Sync customers
exports.upsertCustomers = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (let item of items) {
      const { name, phone, email, outstandingBalance, remoteId } = item;

      let customer;
      if (remoteId) {
        customer = await Customer.findOneAndUpdate(
          { _id: remoteId, userId: req.user.id },
          { name, phone, email, outstandingBalance, updatedAt: Date.now() },
          { new: true }
        );
      }

      if (!customer) {
        customer = new Customer({
          name,
          phone,
          email,
          outstandingBalance,
          userId: req.user.id,
        });
        await customer.save();
      }
      results.push(customer);
    }

    res.status(201).json(Array.isArray(req.body) ? results : results[0]);
  } catch (error) {
    console.error('upsertCustomers error:', error);
    res.status(500).json({ message: error.message || 'Error upserting customers' });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { name, phone, email, outstandingBalance } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, phone, email, outstandingBalance, updatedAt: Date.now() },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('updateCustomer error:', error);
    res.status(500).json({ message: error.message || 'Error updating customer' });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('deleteCustomer error:', error);
    res.status(500).json({ message: error.message || 'Error deleting customer' });
  }
};
