const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const Lead = require('./models/Lead');
const User = require('./models/User');

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm_db';
console.log("Mongo URI exists:", !!process.env.MONGODB_URI);
console.log("Mongo URI value:", process.env.MONGODB_URI ? "FOUND" : "MISSING");

app.use(cors({
  origin: "*"
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.send('CRM Backend is running successfully');
});

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.warn('MongoDB connection failed:', err.message);
});

app.get('/api/leads', async (req, res) => {
  const leads = await Lead.find().sort({ createdAt: -1 });
  res.json(leads);
});

app.post('/api/leads', async (req, res) => {
  const { name, company, email, phone, status, notes } = req.body;
  const lead = new Lead({ name, company, email, phone, status, notes });
  await lead.save();
  res.status(201).json(lead);
});

app.put('/api/leads/:id', async (req, res) => {
  const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.json(lead);
});

app.delete('/api/leads/:id', async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) {
    return res.status(404).json({ message: 'Lead not found' });
  }
  res.json({ message: 'Lead deleted successfully' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email) || !email.toLowerCase().endsWith('@gmail.com')) {
    return res.status(400).json({ message: 'Please use a valid Gmail address ending with @gmail.com' });
  }
  const user = await User.findOne({ email });
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  res.json({ message: 'Login successful', user: { name: user.name, email: user.email, role: user.role } });
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordPattern = /^(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

  if (!name?.trim()) {
    return res.status(400).json({ message: 'Please enter your full name' });
  }
  if (!emailPattern.test(email) || !email.toLowerCase().endsWith('@gmail.com')) {
    return res.status(400).json({ message: 'Please use a valid Gmail address ending with @gmail.com' });
  }
  if (!passwordPattern.test(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters and include one number and one special character' });
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'Email already registered' });
  }
  const user = new User({ name, email, password, role: 'admin' });
  await user.save();
  res.status(201).json({ message: 'Account created', user: { name: user.name, email: user.email, role: user.role } });
});

app.post('/api/change-password', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  const passwordPattern = /^(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
  if (!passwordPattern.test(newPassword)) {
    return res.status(400).json({ message: 'New password must be at least 8 characters and include one number and one special character' });
  }
  const user = await User.findOne({ email });
  if (!user || user.password !== currentPassword) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated successfully' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname,'index.html'));
});

app.listen(port, () => {
  console.log(`CRM website running at http://localhost:${port}`);
});
