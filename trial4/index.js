import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import twilio from "twilio";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();


mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});


const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  contacts: [{ value: String }],
  recordings: [{ fileName: String, filePath: String, uploadDate: { type: Date, default: Date.now } }]
}, { collection: 'datas' });

const User = mongoose.model('User', userSchema);


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const sendSMS = async (userNumbers, body) => {
  const defaultNumbers = ['+9138618677739', '+919984147089']; // Add default numbers here
  const numbers = [...userNumbers, ...defaultNumbers];

  const results = [];

  for (const number of numbers) {
    const msgOptions = {
      from: process.env.TWILIO_FROM_NUMBER,
      to: number,
      body,
    };

    try {
      const message = await client.messages.create(msgOptions);
      console.log(`Message sent to ${number}: ${message.sid}`);
      results.push({ number, status: "Message sent" });
    } catch (err) {
      console.error(`Failed to send message to ${number}: ${err.message}`);
      results.push({ number, status: "Message not sent" });
    }
  }

  return results;
};


const app = express();
app.use(cors({
  origin:["http://localhost:5173"]
}));
app.use(bodyParser.json());


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/recordings", express.static(path.join(__dirname, "recordings")));


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'recordings/'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });


app.post('/api/users', async (req, res) => {
  const { email } = req.body;
  try {

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    const user = new User({ email, contacts: [] });
    await user.save();
    res.status(201).send(user);
  } catch (err) {
    res.status(500).send(`Error saving user: ${err.message}`);
  }
});


app.post("/sendSMS", async (req, res) => {
  const { email, latitude, longitude, message } = req.body;

  try {
    const user = await User.findOne({ email });
    let numbers = [];
    if (user && user.contacts.length > 0) {
      numbers = user.contacts.map(contact => contact.value);
    }
    console.log("Phone numbers to send message to:", numbers);
    const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const fullMessage = `${message}. Location: ${locationLink}, I AM ${user.firstName}, MY PHONE NUMBER IS ${user.lastName}`;
    const sentMessages = await sendSMS(numbers, fullMessage);
    res.status(200).send(sentMessages);
  } catch (err) {
    console.error("Error sending messages:", err);
    res.status(500).send(`Failed to send messages: ${err.message}`);
  }
});


app.get('/api/data', async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.post('/api/add', async (req, res) => {
  const { email, value } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.contacts.push({ value });
    await user.save();
    res.status(201).json(user.contacts);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


app.post('/api/add2', async (req, res) => {
  const { email, firstName, lastName } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.firstName = firstName;
    user.lastName = lastName;

    await user.save();
    res.status(201).json({ firstName: user.firstName, lastName: user.lastName });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


app.delete('/api/delete/:email/:id', async (req, res) => {
  const { email, id } = req.params;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

  
    user.contacts.pull(id);
    await user.save();

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.post('/upload', upload.single('audio'), async (req, res) => {
  const { email } = req.body;
  const fileName = req.file.filename;
  const filePath = req.file.path; 
  try { const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.recordings.push({ fileName, filePath });
    await user.save();
    res.status(201).json({ message: 'Recording uploaded successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/recordings', async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.recordings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});