const mongoose = require('mongoose');

const servicePartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  contact: {
    name: String,
    email: String,
    phone: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  services: [{
    type: String
  }],
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ServicePartner', servicePartnerSchema);