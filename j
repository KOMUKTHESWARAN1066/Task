require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Sequelize, DataTypes } = require("sequelize");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MSSQL
const sequelize = new Sequelize("TaskMaster", "tasksa", "Task@Sa", {
  host: "103.38.50.149",
  port: 5121,
  dialect: "mssql",
  dialectOptions: {
    options: { encrypt: false },
  },
});

sequelize
  .authenticate()
  .then(() => console.log("Database Connected"))
  .catch((err) => console.error("DB Connection Error:", err));

// Define Customer Model
const Customer = sequelize.define("CustomerMaster", {
  customerID: { type: DataTypes.STRING },
  customerName: { type: DataTypes.STRING, allowNull: false },
  address1: DataTypes.STRING,
  address2: DataTypes.STRING,
  address3: DataTypes.STRING,
  city: DataTypes.STRING,
  stateID: DataTypes.STRING,
  countryID: DataTypes.STRING,
  pincode: DataTypes.STRING,
  gstNo: DataTypes.STRING,
  mobileNo: { type: DataTypes.STRING, allowNull: false },
  emailID: DataTypes.STRING,
  active: { type: DataTypes.STRING, defaultValue: "Y" },
  jobName: DataTypes.STRING,
  jobFrequency: DataTypes.STRING,
});

// Define CountryMaster Model
const CountryMaster = sequelize.define("CountryMaster", {
  CountryID: { type: DataTypes.INTEGER, primaryKey: true },
  CountryName: { type: DataTypes.STRING, allowNull: false },
});

// Define StateMaster Model
const StateMaster = sequelize.define("StateMaster", {
  StateID: { type: DataTypes.INTEGER, primaryKey: true },
  StateName: { type: DataTypes.STRING, allowNull: false },
  CountryID: { type: DataTypes.INTEGER, allowNull: false },
});

// Sync Database
sequelize.sync();

// API to Save Customer
app.post("/api/customers", async (req, res) => {
  try {
    const newCustomer = await Customer.create(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API to Fetch Countries
app.get("/api/countries", async (req, res) => {
  try {
    const countries = await CountryMaster.findAll();
    res.json(countries);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API to Fetch States by CountryID
app.get("/api/states/:countryID", async (req, res) => {
  try {
    const { countryID } = req.params;
    const states = await StateMaster.findAll({
      where: { CountryID: countryID },
    });
    res.json(states);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start Server
app.listen(5000, () => console.log("Server running on port 5000"));