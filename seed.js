// seed.js — Run once to add initial roles to MongoDB
// Usage: node seed.js

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/flowdesk';

const roleSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
});
roleSchema.index({ email: 1, role: 1 }, { unique: true });
const Role = mongoose.model('Role', roleSchema);

const seeds = [
  { email: 'bharat@gmail.com', role: 'admin', name: 'Bharat' },
  // Add more roles below as needed:
  // { email: 'rajas@example.com',    role: 'rajas',    name: 'Rajas' },
  // { email: 'naina@example.com',    role: 'naina',    name: 'Naina' },
  // { email: 'biz@example.com',      role: 'business', name: 'Business User' },
  // { email: 'ops@example.com',      role: 'ops',      name: 'Ops User' },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  for (const s of seeds) {
    await Role.findOneAndUpdate(
      { email: s.email, role: s.role },
      { name: s.name },
      { upsert: true, new: true }
    );
    console.log(`✔ ${s.email} → ${s.role}`);
  }

  console.log('\n🌱 Seed complete!');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
