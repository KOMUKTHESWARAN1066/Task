require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
<<<<<<< HEAD
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const sql = require("mssql");
const jwt = require("jsonwebtoken");
=======
const { Sequelize, DataTypes, QueryTypes } = require("sequelize");
>>>>>>> b1128201a7310311ee2f5ca02843c3f21168a5ac

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database configuration
const config = {
  user: "tasksa",
  password: "Task@Sa",
  server: "103.38.50.149",
  port: 5121,
  database: "TaskMaster",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
<<<<<<< HEAD
};

// Connection pool
let pool;
async function connectDB() {
  try {
    pool = await sql.connect(config);
    console.log("Connected to SQL Server");
  } catch (err) {
    console.error("Database Connection Error:", err);
  }
}
connectDB();

// Execute SQL queries safely
async function executeQuery(query, inputs = []) {
  try {
    if (!pool) throw new Error("Database not connected");

    const request = pool.request();
    inputs.forEach(({ name, type, value }) => request.input(name, type, value));

    return await request.query(query);
=======
  logging: console.log,
});

sequelize
  .authenticate()
  .then(() => console.log("Database Connected"))
  .catch((err) => console.error("DB Connection Error:", err));

// Define Models
const Customer = sequelize.define("CustomerMasters", {
  customerID: { type: DataTypes.STRING },
  customerName: { type: DataTypes.STRING, allowNull: false },
  address1: DataTypes.STRING,
  address2: DataTypes.STRING,
  address3: DataTypes.STRING,
  city: DataTypes.STRING,
  stateID: DataTypes.STRING,
  countryID: DataTypes.INTEGER,
  pincode: DataTypes.STRING,
  gstNo: DataTypes.STRING,
  mobileNo: { type: DataTypes.STRING, allowNull: false },
  emailID: DataTypes.STRING,
  active: { type: DataTypes.STRING },
  jobName: DataTypes.STRING,
  jobFrequency: DataTypes.STRING,
});

// Define CountryMaster Model
const CountryMaster = sequelize.define(
  "CountryMasters",
  {
    CountryID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    CountryName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "CountryMasters", // Ensure correct table mapping
    timestamps: false, // Disable Sequelize's automatic timestamps
  }
);

const StateMaster = sequelize.define(
  "StateMasters",
  {
    StateID: { type: DataTypes.INTEGER, primaryKey: true },
    StateName: { type: DataTypes.STRING, allowNull: false },
    CountryID: { type: DataTypes.INTEGER, allowNull: false },
  },
  { tableName: "StateMasters", timestamps: false }
);

sequelize.sync();

// API Routes
app.post("/api/customers", async (req, res) => {
  try {
    const newCustomer = await Customer.create(req.body);
    res.json({ success: true, data: newCustomer });
>>>>>>> b1128201a7310311ee2f5ca02843c3f21168a5ac
  } catch (error) {
    console.error("SQL Query Error:", error);
    throw error;
  }
}

// ==================== Authentication Endpoints ====================


// Login API
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // ✅ Validate input
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    // ✅ Fetch user from database
    const userResult = await executeQuery(
      "SELECT id, username, password FROM Users WHERE username = @username",
      [{ name: "username", type: sql.VarChar, value: username }]
    );

    if (userResult.recordset.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = userResult.recordset[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign({ userId: user.id, username }, "secretkey", {
      expiresIn: "1h",
    });

    // ✅ Capture Client IP Address
    let clientIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    // ✅ Convert IPv6 localhost to IPv4
    if (clientIp === "::1" || clientIp === "127.0.0.1") {
      clientIp = "127.0.0.1";
    }

    // ✅ Remove IPv6 prefix if exists
    if (clientIp.includes("::ffff:")) {
      clientIp = clientIp.split("::ffff:")[1];
    }

    console.log("Client IP Address:", clientIp);

    // ✅ Capture Date and Time in IST
    const logDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const loginTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

    // ✅ Insert login record into the Logs table
    const logResult = await executeQuery(
      `INSERT INTO Logs (employeeID, logDate, loginTime, clientIp)
       OUTPUT INSERTED.logID
       VALUES (@employeeID, @logDate, @loginTime, @clientIp)`,
      [
        { name: "employeeID", type: sql.VarChar, value: username },
        { name: "logDate", type: sql.Date, value: logDate },
        { name: "loginTime", type: sql.DateTime, value: loginTime },
        { name: "clientIp", type: sql.VarChar, value: clientIp }
      ]
    );

    // ✅ Send response with JWT Token + LogID
    res.json({
      token,
      username,
      logID: logResult.recordset[0].logID,
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

<<<<<<< HEAD

app.post("/api/logout", async (req, res) => {
  try {
    const { logID } = req.body;
    await executeQuery(
      "UPDATE Logs SET logoutTime = @logoutTime WHERE logID = @logID",
      [
        { name: "logID", type: sql.Int, value: logID },
        { name: "logoutTime", type: sql.DateTime, value: moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")
        },
      ]
    );
    res.json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Master Data Endpoints ====================
// Countries
=======
app.get("/api/customers", async (req, res) => {
  try {
    const customers = await Customer.findAll();
    res.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

>>>>>>> b1128201a7310311ee2f5ca02843c3f21168a5ac
app.get("/api/countries", async (req, res) => {
  try {
    const result = await executeQuery("SELECT * FROM CountryMasters");
    res.json(result.recordset);
  } catch (error) {
<<<<<<< HEAD
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/countries", async (req, res) => {
  try {
    const { CountryName } = req.body;
    await executeQuery(
      "INSERT INTO CountryMasters (CountryName) VALUES (@CountryName)",
      [{ name: "CountryName", type: sql.VarChar, value: CountryName }]
    );
    res.status(201).json({ message: "Country created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/countries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { CountryName } = req.body;
    await executeQuery(
      "UPDATE CountryMasters SET CountryName = @CountryName WHERE CountryID = @id",
      [
        { name: "id", type: sql.Int, value: id },
        { name: "CountryName", type: sql.VarChar, value: CountryName },
      ]
    );
    res.json({ message: "Country updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/countries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery("DELETE FROM CountryMasters WHERE CountryID = @id", [
      { name: "id", type: sql.Int, value: id },
    ]);
    res.json({ message: "Country deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// States
app.get("/api/states", async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT s.*, c.CountryName 
      FROM StateMasters s
      JOIN CountryMasters c ON s.CountryID = c.CountryID
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
=======
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/states", async (req, res) => {
  try {
    const states = await StateMaster.findAll({
      attributes: ["StateID", "StateName"],
    });
    res.json(states);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
>>>>>>> b1128201a7310311ee2f5ca02843c3f21168a5ac
  }
});

app.get("/api/states/:countryID", async (req, res) => {
  try {
    const { countryID } = req.params;
<<<<<<< HEAD
    const result = await executeQuery(
      "SELECT * FROM StateMasters WHERE CountryID = @countryID",
      [{ name: "countryID", type: sql.Int, value: countryID }]
    );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/states", async (req, res) => {
  try {
    const { StateName, CountryID } = req.body;
    await executeQuery(
      "INSERT INTO StateMasters (StateName, CountryID) VALUES (@StateName, @CountryID)",
      [
        { name: "StateName", type: sql.VarChar, value: StateName },
        { name: "CountryID", type: sql.Int, value: CountryID },
      ]
    );
    res.status(201).json({ message: "State created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/states/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { StateName, CountryID } = req.body;
    await executeQuery(
      "UPDATE StateMasters SET StateName = @StateName, CountryID = @CountryID WHERE StateID = @id",
      [
        { name: "id", type: sql.Int, value: id },
        { name: "StateName", type: sql.VarChar, value: StateName },
        { name: "CountryID", type: sql.Int, value: CountryID },
      ]
    );
    res.json({ message: "State updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/states/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery("DELETE FROM StateMasters WHERE StateID = @id", [
      { name: "id", type: sql.Int, value: id },
    ]);
    res.json({ message: "State deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Customer Endpoints ====================
app.get("/api/customers", async (req, res) => {
  try {
    const result = await executeQuery("SELECT * FROM CustomerMasters");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/customers", async (req, res) => {
  try {
    const { customerID, customerName, mobileNo } = req.body;
    await executeQuery(
      `INSERT INTO CustomerMasters 
       (customerID, customerName, mobileNo)
       VALUES (@customerID, @customerName, @mobileNo)`,
      [
        { name: "customerID", type: sql.VarChar, value: customerID },
        { name: "customerName", type: sql.VarChar, value: customerName },
        { name: "mobileNo", type: sql.VarChar, value: mobileNo },
      ]
    );
    res.status(201).json({ message: "Customer created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Job Management Endpoints ====================
// Job Types
app.get("/api/jobtypes", async (req, res) => {
  try {
    const result = await executeQuery("SELECT * FROM JobTypeMasters");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/jobtypes", async (req, res) => {
  try {
    const { jobTypeName } = req.body;
    await executeQuery(
      "INSERT INTO JobTypeMasters (jobTypeName) VALUES (@jobTypeName)",
      [{ name: "jobTypeName", type: sql.VarChar, value: jobTypeName }]
    );
    res.status(201).json({ message: "Job type created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Jobs
app.get("/api/jobs", async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT j.*, jt.jobTypeName 
      FROM JobMasters j
      JOIN JobTypeMasters jt ON j.jobTypeID = jt.jobTypeID
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/jobs", async (req, res) => {
  try {
    const { jobTypeID, jobName, frequency, recurringDate } = req.body;
    await executeQuery(
      `INSERT INTO JobMasters 
       (jobTypeID, jobName, frequency, recurringDate)
       VALUES (@jobTypeID, @jobName, @frequency, @recurringDate)`,
      [
        { name: "jobTypeID", type: sql.Int, value: jobTypeID },
        { name: "jobName", type: sql.VarChar, value: jobName },
        { name: "frequency", type: sql.VarChar, value: frequency },
        { name: "recurringDate", type: sql.DateTime, value: recurringDate },
      ]
    );
    res.status(201).json({ message: "Job created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Customer Jobs Endpoints ====================
app.get("/api/customer-jobs", async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT cjm.*, cm.customerName, jm.jobName, u.username
      FROM CustomerJobMaster cjm
      JOIN CustomerMasters cm ON cjm.customerID = cm.customerID
      JOIN JobMasters jm ON cjm.jobID = jm.jobID
      JOIN Users u ON cjm.employeeID = u.id
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==================== Company API ====================
app.get("/api/company", async (req, res) => {
  try {
    const result = await executeQuery("SELECT * FROM company_details");
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Company details not found" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Error Handling ====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Internal Server Error", details: err.message });
});

// ==================== Server Setup ====================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
=======
    const states = await StateMaster.findAll({
      where: { CountryID: parseInt(countryID) },
    });
    res.json(states);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/countries", async (req, res) => {
  try {
    const { CountryName } = req.body;
    if (!CountryName) {
      return res
        .status(400)
        .json({ success: false, message: "Country Name is required" });
    }
    const newCountry = await CountryMaster.create({ CountryName });
    res.json({ success: true, data: newCountry });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/countries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { CountryName } = req.body;
    const country = await CountryMaster.findByPk(id);
    if (!country) {
      return res
        .status(404)
        .json({ success: false, message: "Country not found" });
    }
    await country.update({ CountryName });
    res.json({ success: true, message: "Country updated successfully" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/countries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const country = await CountryMaster.findByPk(id);
    if (!country) {
      return res
        .status(404)
        .json({ success: false, message: "Country not found" });
    }
    await country.destroy();
    res.json({ success: true, message: "Country deleted successfully" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
>>>>>>> b1128201a7310311ee2f5ca02843c3f21168a5ac
