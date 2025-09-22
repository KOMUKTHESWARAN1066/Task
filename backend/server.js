require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const sql = require("mssql");
const jwt = require("jsonwebtoken");

const app = express();
app.use(
  cors({
    origin: "*",
    methods: "GET, POST, PUT, DELETE, OPTIONS",
  })
);
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
// Proper startup sequence
connectDB(); // Handle connection failures
// Execute SQL queries safely
async function executeQuery(query, inputs = []) {
  await connectDB();
  try {
    const request = pool.request();
    inputs.forEach(({ name, type, value }) => request.input(name, type, value));
    return await request.query(query);
  } catch (error) {
    console.error("SQL Query Error:", error);
    throw error;
  }
}

// ==================== Error Handling ====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Internal Server Error", details: err.message });
});

// ==================== Authentication Endpoints ====================
// ? Login API
app.post("/api/login", async (req, res) => {
  const { username, password, clientIp, compid } = req.body;

  if (!username || !password || !compid) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    // 1. Connect to the MASTER DB (TaskMaster) and get company config from DBLIST
    let masterPool = await sql.connect(config);
    let compRes = await masterPool
      .request()
      .input("compid", sql.Int, compid)
      .query("SELECT * FROM DBLIST WHERE COMPID = @compid");

    if (compRes.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }
    const company = compRes.recordset[0];

    // 2. Build config for the chosen company DB
    const companyDbConfig = {
      user: company.USERNAME,
      password: company.PASSWORD,
      server: company.SERVERNAME,
      database: company.DBNAME,
      options: {
        trustServerCertificate: true,
      },
    };

    // 3. Connect to the target company DB
    let pool = await sql.connect(companyDbConfig);

    // 4. Query for the user in the correct DB
    let userResult = await pool
      .request()
      .input("username", sql.VarChar, username)
      .query("SELECT * FROM Users WHERE username = @username");

    if (userResult.recordset.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    const user = userResult.recordset[0];
    const flag = user.adminflag;
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }
    const JWT_SECRET = "hello";
    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ success: false, message: "Server error: Missing secret key" });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const logDate = moment().format("YYYY-MM-DD");
    const loginTime = moment().format("YYYY-MM-DD HH:mm:ss");
    const time = moment().format("HH:mm:ss");

    let logResult = await pool
      .request()
      .input("employeeID", sql.Int, user.id)
      .input("logDate", sql.Date, logDate)
      .input("loginTime", sql.DateTime, loginTime)
      .input("clientIp", sql.VarChar, clientIp)
      .query(
        "INSERT INTO Logs (employeeID, logDate, loginTime, clientIp) OUTPUT INSERTED.logID VALUES (@employeeID, @logDate, @loginTime, @clientIp)"
      );

    res.json({
      employeeID: user.id,
      employeeName: user.employeeName,
      success: true,
      message: "Login successful",
      token,
      username: user.username,
      time: time,
      logID: logResult.recordset[0].logID,
      Flag: flag,
      clientip: clientIp,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/logout", async (req, res) => {
  try {
    let logID;

    // ? Check if the request is from navigator.sendBeacon
    if (req.headers["content-type"] === "text/plain;charset=UTF-8") {
      const rawBody = await new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => {
          data += chunk;
        });
        req.on("end", () => {
          resolve(data);
        });
      });

      // ? Parse the raw text body as JSON
      const parsedBody = JSON.parse(rawBody);
      logID = parsedBody.logID;
    } else {
      // ? If it's from Axios or normal request
      logID = req.body.logID;
    }

    await executeQuery(
      "UPDATE Logs SET logoutTime = @logoutTime WHERE logID = @logID",
      [
        { name: "logID", type: sql.Int, value: logID },
        {
          name: "logoutTime",
          type: sql.DateTime,
          value: moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
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
app.get("/api/countries", async (req, res) => {
  try {
    const result = await executeQuery("SELECT * FROM CountryMasters");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/countries", async (req, res) => {
  try {
    let { CountryName } = req.body;

    if (!CountryName) {
      return res.status(400).json({ error: "CountryName is required" });
    }

    CountryName = CountryName.toUpperCase();

    // Check if the country already exists
    const existingCountry = await executeQuery(
      "SELECT COUNT(*) AS count FROM CountryMasters WHERE CountryName = @CountryName",
      [{ name: "CountryName", type: sql.VarChar, value: CountryName }]
    );

    if (existingCountry[0]?.count > 0) {
      return res.status(400).json({ error: "Country already exists" });
    }

    // Insert new country
    await executeQuery(
      "INSERT INTO CountryMasters (CountryName) VALUES (@CountryName)",
      [{ name: "CountryName", type: sql.VarChar, value: CountryName }]
    );

    res.status(201).json({ message: "Country created successfully" });
  } catch (error) {
    console.error("Error:", error.message);

    // Handle UNIQUE constraint violation error
    if (error.message.includes("Violation of UNIQUE KEY constraint")) {
      return res.status(400).json({
        error: "Country already exists. Please enter a different name.",
      });
    }

    res.status(500).json({ error: error.message });
  }
});

app.put("/api/countries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { CountryName } = req.body;

    console.log(`Received PUT request for CountryID: ${id}`);
    console.log(`Request Body:`, req.body);

    if (!id || isNaN(id)) {
      console.log("Invalid ID received:", id);
      return res.status(400).json({ error: "Invalid Country ID" });
    }

    if (!CountryName) {
      console.log("Missing CountryName in request body");
      return res.status(400).json({ error: "CountryName is required" });
    }

    CountryName = CountryName.toUpperCase();

    // Check if the new country name already exists
    const existingCountry = await executeQuery(
      "SELECT COUNT(*) AS count FROM CountryMasters WHERE CountryName = @CountryName AND CountryID != @id",
      [
        { name: "CountryName", type: sql.VarChar, value: CountryName },
        { name: "id", type: sql.Int, value: id },
      ]
    );

    if (existingCountry[0]?.count > 0) {
      return res
        .status(400)
        .json({ error: "Country already exists with this name." });
    }

    // Update country name
    const result = await executeQuery(
      "UPDATE CountryMasters SET CountryName = @CountryName WHERE CountryID = @id",
      [
        { name: "id", type: sql.Int, value: id },
        { name: "CountryName", type: sql.VarChar, value: CountryName },
      ]
    );

    console.log("Update Result:", result);

    res.json({ message: "Country updated successfully" });
  } catch (error) {
    console.error("Error in PUT /api/countries/:id:", error);

    // Handle UNIQUE constraint violation error
    if (error.message.includes("Violation of UNIQUE KEY constraint")) {
      return res.status(400).json({
        error: "Country already exists.",
      });
    }

    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/countries/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Country ID is required" });
    }

    // Check if the country exists
    const countryExists = await executeQuery(
      "SELECT COUNT(*) AS count FROM CountryMasters WHERE CountryID = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    const countryCount = countryExists?.recordset?.[0]?.count ?? 0;
    if (countryCount === 0) {
      return res.status(404).json({ error: "Country not found." });
    }

    // Check if any states exist for the given country
    const existingStates = await executeQuery(
      "SELECT COUNT(*) AS count FROM StateMasters WHERE CountryID = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    const stateCount = existingStates?.recordset?.[0]?.count ?? 0;

    if (stateCount > 0) {
      return res.status(400).json({
        error: "This country has associated states. Delete the states first.",
      });
    }

    // Proceed to delete the country
    await executeQuery("DELETE FROM CountryMasters WHERE CountryID = @id", [
      { name: "id", type: sql.Int, value: id },
    ]);

    res.json({ message: "Country deleted successfully." });
  } catch (error) {
    console.error("Error deleting country:", error);
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
  }
});

app.get("/api/states/:countryID", async (req, res) => {
  try {
    const { countryID } = req.params;
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
    console.log("Request received:", req.body);
    let { StateName, CountryID } = req.body;

    if (!StateName || !CountryID) {
      return res
        .status(400)
        .json({ error: "StateName and CountryID are required" });
    }

    StateName = StateName.toUpperCase();
    console.log("Converted StateName:", StateName);

    // Check if the state already exists
    const existingState = await executeQuery(
      "SELECT COUNT(*) AS count FROM StateMasters WHERE StateName = @StateName",
      [{ name: "StateName", type: sql.VarChar, value: StateName }]
    );

    console.log("Existing state count:", existingState[0]?.count);

    if (existingState[0]?.count > 0) {
      return res.status(400).json({ error: "State already exists" });
    }

    // Insert new state
    await executeQuery(
      "INSERT INTO StateMasters (StateName, CountryID) VALUES (@StateName, @CountryID)",
      [
        { name: "StateName", type: sql.VarChar, value: StateName },
        { name: "CountryID", type: sql.Int, value: parseInt(CountryID) },
      ]
    );

    res.status(201).json({ message: "State created successfully" });
  } catch (error) {
    console.error("Error:", error.message);

    // Check for UNIQUE constraint violation error
    if (error.message.includes("Violation of UNIQUE KEY constraint")) {
      return res.status(400).json({ error: "State already exists. " });
    }

    res.status(500).json({ error: error.message });
  }
});

app.put("/api/states/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { StateName, CountryID } = req.body;

    if (!id || !StateName || !CountryID) {
      return res
        .status(400)
        .json({ error: "StateID, StateName, and CountryID are required" });
    }

    StateName = StateName.toUpperCase();

    // Check if the state exists before updating
    const stateExists = await executeQuery(
      "SELECT * FROM StateMasters WHERE StateID = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    if (!stateExists || stateExists.length === 0) {
      return res.status(404).json({ error: "State not found" });
    }

    // Check if a different state already has this name
    const existingState = await executeQuery(
      "SELECT COUNT(*) AS count FROM StateMasters WHERE StateName COLLATE SQL_Latin1_General_CP1_CI_AS = @StateName AND StateID <> @id",
      [
        { name: "StateName", type: sql.VarChar, value: StateName },
        { name: "id", type: sql.Int, value: id },
      ]
    );

    const stateCount = existingState[0]?.count ?? 0;

    if (stateCount > 0) {
      return res.status(400).json({ error: "State name already exists" });
    }

    // Update the state
    await executeQuery(
      "UPDATE StateMasters SET StateName = @StateName, CountryID = @CountryID WHERE StateID = @id",
      [
        { name: "id", type: sql.Int, value: id },
        { name: "StateName", type: sql.VarChar, value: StateName },
        { name: "CountryID", type: sql.Int, value: parseInt(CountryID) },
      ]
    );

    res.json({ message: "State updated successfully" });
  } catch (error) {
    console.error("Error:", error.message);
    if (error.message.includes("Violation of UNIQUE KEY constraint")) {
      return res.status(400).json({
        error: "State already exists. ",
      });
    }

    res.status(500).json({ error: "Internal Server Error" });
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
  const {
    TypeOfCustomer,
    customerID,
    customerName,
    address1,
    address2,
    address3,
    city,
    stateID,
    countryID,
    pincode,
    gstNo,
    tanNo,
    pfNo,
    esiNo,
    panNo,
    mobileNo,    
    Authorized_Person,
    Authorized_Person_Contant_Number,
    Authorized_Person_Mail_Id,
    emailID,
    active,
  } = req.body;
  console.log(req.body);

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    // Insert into CustomerMasters
    const customerQuery = `
      INSERT INTO dbo.CustomerMasters 
      (TypeOfCustomer, CustomerID, CustomerName, Address1, Address2, Address3, City, StateID, CountryID, 
       Pincode, GSTNo, TANNo, PFNo, ESINo, panNo, MobileNo, Authorized_Person, 
       Authorized_Person_Contant_Number, Authorized_Person_Mail_Id, EmailID, Active)
      VALUES (@TypeOfCustomer, @CustomerID, @CustomerName, @Address1, @Address2, @Address3, @City, 
              @StateID, @CountryID, @Pincode, @GSTNo, @TANNo, @PFNo, @ESINo, @panNo, @MobileNo,
              @Authorized_Person, @Authorized_Person_Contant_Number, @Authorized_Person_Mail_Id, @EmailID, @Active)
    `;

    await transaction
      .request()
      .input("CustomerID", sql.VarChar, customerID)
      .input("TypeOfCustomer", sql.VarChar, TypeOfCustomer)
      .input("CustomerName", sql.NVarChar, customerName)
      .input("Address1", sql.NVarChar, address1)
      .input("Address2", sql.NVarChar, address2)
      .input("Address3", sql.NVarChar, address3)
      .input("City", sql.NVarChar, city)
      .input("StateID", sql.Int, stateID)
      .input("CountryID", sql.Int, countryID)
      .input("Pincode", sql.NVarChar, pincode)
      .input("GSTNo", sql.NVarChar, gstNo)
      .input("TANNo", sql.NVarChar, tanNo)
      .input("panNo", sql.NVarChar, panNo)
      .input("PFNo", sql.NVarChar, pfNo)
      .input("ESINo", sql.NVarChar, esiNo)
      .input("MobileNo", sql.NVarChar, mobileNo)
      .input("Authorized_Person", sql.NVarChar, Authorized_Person)
      .input("Authorized_Person_Contant_Number",sql.NVarChar,Authorized_Person_Contant_Number)
      .input("Authorized_Person_Mail_Id",sql.NVarChar,Authorized_Person_Mail_Id)
      .input("EmailID", sql.NVarChar, emailID)
      .input("Active", sql.Char, active)
      .query(customerQuery);

    // Insert into CustomerJobMaster if Job Name & Frequency provided

    await transaction.commit();

    res.json({ success: true, message: "Customer added successfully!" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error adding customer:", error);
    res.status(500).json({ error: "Failed to add customer" });
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
    let { jobTypeName } = req.body;

    // Convert jobTypeName to uppercase
    jobTypeName = jobTypeName.toUpperCase();

    // Check if the job type already exists
    const existingJobType = await executeQuery(
      "SELECT * FROM JobTypeMasters WHERE jobTypeName = @jobTypeName",
      [{ name: "jobTypeName", type: sql.VarChar, value: jobTypeName }]
    );

    if (existingJobType.length > 0) {
      return res.status(400).json({ error: "Job Type already exists." });
    }

    // Insert new job type
    await executeQuery(
      "INSERT INTO JobTypeMasters (jobTypeName) VALUES (@jobTypeName)",
      [{ name: "jobTypeName", type: sql.VarChar, value: jobTypeName }]
    );

    res.status(201).json({ message: "Job type created successfully" });
  } catch (error) {
    // Check for UNIQUE constraint violation
    if (error.message.includes("Violation of UNIQUE KEY constraint")) {
      return res.status(400).json({ error: "JobType  already exists." });
    }

    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/jobtypes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { jobTypeName } = req.body;

    // Convert jobTypeName to uppercase
    jobTypeName = jobTypeName.toUpperCase();

    // Check if job type already exists (excluding the current one being updated)
    const existingJobType = await executeQuery(
      "SELECT * FROM JobTypeMasters WHERE jobTypeName = @jobTypeName AND jobTypeID <> @id",
      [
        { name: "jobTypeName", type: sql.VarChar, value: jobTypeName },
        { name: "id", type: sql.Int, value: id },
      ]
    );

    if (existingJobType.length > 0) {
      return res.status(400).json({ error: "Job Type already exists." });
    }

    // Update job type
    await executeQuery(
      "UPDATE JobTypeMasters SET jobTypeName = @jobTypeName WHERE jobTypeID = @id",
      [
        { name: "jobTypeName", type: sql.VarChar, value: jobTypeName },
        { name: "id", type: sql.Int, value: id },
      ]
    );

    res.json({ message: "Job type updated successfully" });
  } catch (error) {
    // Handle UNIQUE KEY constraint violation
    if (error.message.includes("Violation of UNIQUE KEY constraint")) {
      return res.status(400).json({ error: "Job Type already exists." });
    }

    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/jobtypes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the job type exists before deleting
    const existingJobType = await executeQuery(
      "SELECT * FROM JobTypeMasters WHERE jobTypeID = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    if (existingJobType.length === 0) {
      return res.status(404).json({ error: "Job Type not found." });
    }

    // Delete job type
    await executeQuery("DELETE FROM JobTypeMasters WHERE jobTypeID = @id", [
      { name: "id", type: sql.Int, value: id },
    ]);

    res.json({ message: "Job type deleted successfully" });
  } catch (error) {
    console.error("Error:", error.message);
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
    let { jobTypeID, jobName, frequency, recurringDate } = req.body;

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

app.put("/api/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { jobTypeID, jobName, frequency, recurringDate } = req.body;

    await executeQuery(
      `UPDATE JobMasters 
       SET jobTypeID = @jobTypeID, 
           jobName = @jobName, 
           frequency = @frequency, 
           recurringDate = @recurringDate
       WHERE jobID = @id`,
      [
        { name: "jobTypeID", type: sql.Int, value: jobTypeID },
        { name: "jobName", type: sql.VarChar, value: jobName },
        { name: "frequency", type: sql.VarChar, value: frequency },
        { name: "recurringDate", type: sql.DateTime, value: recurringDate },
        { name: "id", type: sql.Int, value: id },
      ]
    );

    res.json({ message: "Job updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await executeQuery("DELETE FROM JobMasters WHERE jobID = @id", [
      { name: "id", type: sql.Int, value: id },
    ]);

    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ? Get All Users (Employees)
app.get("/api/employees", async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT id, username, employeeName, dateOfBirth, fatherName, motherName, 
              dateOfJoining, phoneNumber, emergencyNumber, mailID, permanentAddress, 
              presentAddress, panNo, aadharNo, maritalStatus, qualification, active, adminflag
       FROM Users`
    );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ? Add User (Employee)
app.post("/api/employees", async (req, res) => {
  try {
    let {
      username,
      password: plainpassword,
      employeeName,
      dateOfBirth,
      fatherName,
      motherName,
      dateOfJoining,
      phoneNumber,
      emergencyNumber,
      mailID,
      permanentAddress,
      presentAddress,
      panNo,
      aadharNo,
      maritalStatus,
      qualification,
      active = 'Y'
    } = req.body;

    // Validate required fields
    if (!username || !plainpassword || !employeeName) {
      return res.status(400).json({ 
        error: "Username, password, and employee name are required" 
      });
    }

    const password = await bcrypt.hash(plainpassword, 10);

    // Convert text fields to uppercase
    employeeName = employeeName.toUpperCase();
    fatherName = fatherName ? fatherName.toUpperCase() : null;
    motherName = motherName ? motherName.toUpperCase() : null;

    // Check if the username already exists
    let existingUser = await executeQuery(
      "SELECT * FROM Users WHERE username = @username",
      [{ name: "username", type: sql.VarChar, value: username }]
    );

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ error: "Employee already exists" });
    }

    // Insert new employee
    await executeQuery(
      `INSERT INTO Users (
        username, password, employeeName, dateOfBirth, fatherName, motherName,
        dateOfJoining, phoneNumber, emergencyNumber, mailID, permanentAddress, 
        presentAddress, panNo, aadharNo, maritalStatus, qualification, active
      ) VALUES (
        @employeeID, @username, @password, @employeeName, @dateOfBirth, @fatherName, @motherName,
        @dateOfJoining, @phoneNumber, @emergencyNumber, @mailID, @permanentAddress,
        @presentAddress, @panNo, @aadharNo, @maritalStatus, @qualification, @active
      )`,
      [
        { name: "username", type: sql.VarChar, value: username },
        { name: "password", type: sql.VarChar, value: password },
        { name: "employeeName", type: sql.VarChar, value: employeeName },
        { name: "dateOfBirth", type: sql.Date, value: dateOfBirth || null },
        { name: "fatherName", type: sql.VarChar, value: fatherName },
        { name: "motherName", type: sql.VarChar, value: motherName },
        { name: "dateOfJoining", type: sql.Date, value: dateOfJoining || null },
        { name: "phoneNumber", type: sql.VarChar, value: phoneNumber || null },
        { name: "emergencyNumber", type: sql.VarChar, value: emergencyNumber || null },
        { name: "mailID", type: sql.VarChar, value: mailID || null },
        { name: "permanentAddress", type: sql.NVarChar, value: permanentAddress || null },
        { name: "presentAddress", type: sql.NVarChar, value: presentAddress || null },
        { name: "panNo", type: sql.VarChar, value: panNo || null },
        { name: "aadharNo", type: sql.VarChar, value: aadharNo || null },
        { name: "maritalStatus", type: sql.VarChar, value: maritalStatus || null },
        { name: "qualification", type: sql.VarChar, value: qualification || null },
        { name: "active", type: sql.Char, value: active }
      ]
    );

    res.status(201).json({ message: "Employee added successfully" });
  } catch (error) {
    // Handle UNIQUE KEY constraint violation
    if (error.message.includes("Violation of UNIQUE KEY constraint")) {
      return res.status(400).json({ error: "Employee already exists." });
    }

    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ? Update User (Employee)
app.put("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let {
      username,
      password: plainpassword,
      employeeName,
      dateOfBirth,
      fatherName,
      motherName,
      dateOfJoining,
      phoneNumber,
      emergencyNumber,
      mailID,
      permanentAddress,
      presentAddress,
      panNo,
      aadharNo,
      maritalStatus,
      qualification,
      active = 'Y'
    } = req.body;

    // Validate required fields
    if (!username || !employeeName) {
      return res.status(400).json({ 
        error: "Username and employee name are required" 
      });
    }

    // Convert text fields to uppercase
    employeeName = employeeName.toUpperCase();
    fatherName = fatherName ? fatherName.toUpperCase() : null;
    motherName = motherName ? motherName.toUpperCase() : null;

    // Check if username already exists for another employee
    const existingUser = await executeQuery(
      "SELECT * FROM Users WHERE username = @username AND id != @id",
      [
        { name: "username", type: sql.VarChar, value: username },
        { name: "id", type: sql.Int, value: id },
      ]
    );

    if (existingUser.recordset.length > 0) {
      return res
        .status(400)
        .json({ error: "Username already exists for another employee." });
    }

    let query = `UPDATE Users SET 
                 username = @username, 
                 employeeName = @employeeName,
                 dateOfBirth = @dateOfBirth,
                 fatherName = @fatherName,
                 motherName = @motherName,
                 dateOfJoining = @dateOfJoining,
                 phoneNumber = @phoneNumber,
                 emergencyNumber = @emergencyNumber,
                 mailID = @mailID,
                 permanentAddress = @permanentAddress,
                 presentAddress = @presentAddress,
                 panNo = @panNo,
                 aadharNo = @aadharNo,
                 maritalStatus = @maritalStatus,
                 qualification = @qualification,
                 active = @active`;

    const params = [
      { name: "username", type: sql.VarChar, value: username },
      { name: "employeeName", type: sql.VarChar, value: employeeName },
      { name: "dateOfBirth", type: sql.Date, value: dateOfBirth || null },
      { name: "fatherName", type: sql.VarChar, value: fatherName },
      { name: "motherName", type: sql.VarChar, value: motherName },
      { name: "dateOfJoining", type: sql.Date, value: dateOfJoining || null },
      { name: "phoneNumber", type: sql.VarChar, value: phoneNumber || null },
      { name: "emergencyNumber", type: sql.VarChar, value: emergencyNumber || null },
      { name: "mailID", type: sql.VarChar, value: mailID || null },
      { name: "permanentAddress", type: sql.NVarChar, value: permanentAddress || null },
      { name: "presentAddress", type: sql.NVarChar, value: presentAddress || null },
      { name: "panNo", type: sql.VarChar, value: panNo || null },
      { name: "aadharNo", type: sql.VarChar, value: aadharNo || null },
      { name: "maritalStatus", type: sql.VarChar, value: maritalStatus || null },
      { name: "qualification", type: sql.VarChar, value: qualification || null },
      { name: "active", type: sql.Char, value: active },
      { name: "id", type: sql.Int, value: id }
    ];

    // Only update password if provided
    if (plainpassword && plainpassword.trim() !== "") {
      const password = await bcrypt.hash(plainpassword, 10);
      query += `, password = @password`;
      params.push({ name: "password", type: sql.VarChar, value: password });
    }

    query += ` WHERE id = @id`;

    await executeQuery(query, params);

    res.json({ message: "Employee updated successfully" });
  } catch (error) {
    if (error.message.includes("Violation of UNIQUE KEY constraint")) {
      return res
        .status(400)
        .json({ error: "Username already exists for another employee." });
    }

    console.error("Error in PUT /api/employees/:id:", error);
    res
      .status(500)
      .json({ error: "Internal server error. Please try again later." });
  }
});

// ? Delete User (Employee)
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🚀 Attempting to delete employee ID: ${id}`);

    // Step 1: Check if employee exists and is an admin
    const result = await executeQuery(
      "SELECT adminflag FROM Users WHERE id = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    if (result.recordset.length === 0) {
      console.log(`⚠️ No employee found with ID ${id}`);
      return res.status(404).json({ message: "Employee not found." });
    }

    if (result.recordset[0].adminflag === 1) {
      console.warn(`🚫 Cannot delete admin user with ID ${id}`);
      return res
        .status(403)
        .json({ message: "You don't have rights to delete an admin." });
    }

    // Step 2: Try deleting employee
    const deleteResult = await executeQuery(
      "DELETE FROM Users WHERE id = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    if (deleteResult.rowsAffected === 0) {
      console.log(`⚠️ No employee found with ID ${id}`);
      return res.status(404).json({ message: "Employee not found." });
    }

    console.log(`✅ Employee ID ${id} deleted successfully.`);
    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("🔥 Error deleting employee:", error);
    res.status(500).json({ error: error.message });
  }
});


app.get("/api/customer-jobs", async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT cjm.*, cm.customerName, jm.jobName, u.employeeName
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

app.post("/api/customer-jobs", async (req, res) => {
  try {
    const {
      customerID,
      jobID,
      jobFrequency,
      jobDate,
      receivedDate,
      dueDate,
      employeeID,
    } = req.body;

    // Validate request body
    if (!customerID || !jobID || !jobFrequency || !jobDate || !employeeID) {
      return res.status(400).json({ message: "All fields are required" });
    }

    await executeQuery(
      `INSERT INTO CustomerJobMaster (customerID, jobID, jobFrequency, jobDate, receivedDate, dueDate, employeeID,LastCompletedDate) 
       VALUES (@customerID, @jobID, @jobFrequency, @jobDate, @receivedDate, @dueDate, @employeeID,@jobDate)`,
      [
        { name: "customerID", type: sql.NVarChar, value: customerID },
        { name: "jobID", type: sql.Int, value: jobID },
        { name: "jobFrequency", type: sql.VarChar, value: jobFrequency },
        { name: "jobDate", type: sql.Date, value: jobDate },
        { name: "receivedDate", type: sql.Date, value: receivedDate },
        { name: "dueDate", type: sql.Date, value: dueDate },
        { name: "employeeID", type: sql.Int, value: employeeID },
        { name: "LastCompletedDate", type: sql.Date, value: jobDate },
      ]
    );
    console.log(req.body, "req");

    res
      .status(201)
      .json({ success: true, message: "Customer job created successfully" });
  } catch (error) {
    console.error("Error in /api/customer-jobs:", error);
    res.status(500).json({ error: error.message });
  }
  console.log("req", req);
  console.log("res", res);
});

// Update a customer job
app.put("/api/customer-jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { customerID, jobID, jobFrequency, jobDate, employeeID } = req.body;

    if (!customerID || !jobID || !jobFrequency || !jobDate || !employeeID) {
      return res.status(400).json({ message: "All fields are required" });
    }

    await executeQuery(
      `UPDATE CustomerJobMaster 
       SET customerID = @customerID, jobID = @jobID, jobFrequency = @jobFrequency, 
           jobDate = @jobDate, employeeID = @employeeID,LastCompletedDate=@jobDate
       WHERE customerJobID = @id`,
      [
        { name: "customerID", type: sql.NVarChar, value: customerID },
        { name: "jobID", type: sql.Int, value: jobID },
        { name: "jobFrequency", type: sql.VarChar, value: jobFrequency },
        { name: "jobDate", type: sql.Date, value: jobDate },
        { name: "employeeID", type: sql.Int, value: employeeID },
        { name: "id", type: sql.Int, value: id },
        { name: "LastCompletedDate", type: sql.Date, value: jobDate },
      ]
    );

    res.json({ message: "Customer job updated successfully" });
  } catch (error) {
    console.error("Error in /api/customer-jobs:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a customer job
app.delete("/api/customer-jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await executeQuery(
      `DELETE FROM CustomerJobMaster WHERE customerJobID = @id`,
      [{ name: "id", type: sql.Int, value: id }] // ? Pass an array with SQL type
    );

    res.json({ message: "deleted successfully" });
  } catch (error) {
    console.error("Error in /api/customer-jobs:", error);
    res.status(500).json({ error: error.message });
  }
  console.log("req", req);
  console.log("res", res);
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

app.get("/api/companies-details", async (req, res) => {
  const result = await sql.query("SELECT COMPID, COMPNAME FROM DBLIST");
  res.json(result.recordset);
});

app.get("/api/pending-jobs", async (req, res) => {
  const isAdmin = req.query.flag === "true" || req.query.flag === "1";
  const empID = req.query.empID;

  // Returns a Date object that is midnight IST (UTC+5:30) for the given date
  function toISTMidnight(date) {
    return moment(date).tz("Asia/Kolkata").startOf("day").toDate();
  }

  // Advances a date by frequency, always returns midnight IST as UTC Date
  function incrementDateIST(date, freq) {
    if (!date) return null;
    let d = new Date(date);
    switch (freq) {
      case "Daily":
        d.setUTCDate(d.getUTCDate() + 1);
        break;
      case "Weekly":
        d.setUTCDate(d.getUTCDate() + 7);
        break;
      case "Fortnightly":
        d.setUTCDate(d.getUTCDate() + 14);
        break;
      case "Monthly":
        d.setUTCMonth(d.getUTCMonth() + 1);
        break;
      case "Quarterly":
        d.setUTCMonth(d.getUTCMonth() + 3);
        break;
      case "Half-Yearly":
        d.setUTCMonth(d.getUTCMonth() + 6);
        break;
      case "Annually":
        d.setUTCFullYear(d.getUTCFullYear() + 1);
        break;
      case "One-Time":
        return null; // don't repeat
      default:
        return null;
    }
    return toISTMidnight(d);
  }

  try {
    let query = `
      SELECT 
        cjm.CustomerJobID,
        cjm.CustomerID,
        cjm.JobID,
        cjm.dueDate,
        cjm.employeeID,
        cm.customerName, 
        jm.jobName, 
        u.employeeName,
        cjm.jobFrequency
      FROM CustomerJobMaster cjm
      JOIN CustomerMasters cm ON cjm.customerID = cm.customerID
      JOIN JobMasters jm ON cjm.jobID = jm.jobID
      JOIN Users u ON cjm.employeeID = u.id
      WHERE 1=1
    `;
    if (!isAdmin) query += " AND cjm.employeeID = @empID";
    query += " ORDER BY cjm.dueDate DESC";

    const pool = await sql.connect();
    const request = pool.request();
    if (!isAdmin) {
      request.input("empID", sql.Int, parseInt(empID, 10));
    }
    const result = await request.query(query);
    const jobs = result.recordset;

    // Use IST midnight today as cutoff
    const todayIST = toISTMidnight(new Date());

    for (const job of jobs) {
      // skip blanks or unknowns
      if (
        !job.dueDate ||
        isNaN(new Date(job.dueDate).getTime()) ||
        !job.jobFrequency
      ) {
        console.log(
          `❗ Skipping job, invalid date/frequency: CustomerJobID=${job.CustomerJobID}, dueDate=${job.dueDate}, jobFrequency=${job.jobFrequency}`
        );
        continue;
      }

      const jobID = job.CustomerJobID;
      let checkDate = toISTMidnight(new Date(job.dueDate));
      let loopLimit = 2000;

      while (checkDate && checkDate <= todayIST && loopLimit-- > 0) {
        // check if already exists
        const existsResult = await pool
          .request()
          .input("CustomerJobID", sql.Int, jobID)
          .input("JobDueDate", sql.DateTimeOffset, checkDate).query(`
            SELECT 1 FROM CustomerJobDone
            WHERE CustomerJobID = @CustomerJobID AND JobDueDate = @JobDueDate
          `);

        if (existsResult.recordset.length === 0) {
          await pool
            .request()
            .input("CustomerJobID", sql.Int, jobID)
            .input("CustomerID", sql.NVarChar, job.CustomerID)
            .input("JobID", sql.Int, job.JobID)
            .input("JobDueDate", sql.DateTimeOffset, checkDate)
            .input("CompletedDate", sql.DateTimeOffset, null)
            .input("EmployeeID", sql.Int, job.employeeID)
            .input("Remarks", sql.NVarChar, "")
            .input("completed_flag", sql.Bit, 0).query(`
              INSERT INTO CustomerJobDone
                (CustomerJobID, CustomerID, JobID, JobDueDate, CompletedDate, EmployeeID, Remarks, completed_flag)
              VALUES
                (@CustomerJobID, @CustomerID, @JobID, @JobDueDate, @CompletedDate, @EmployeeID, @Remarks, @completed_flag)
            `);
          console.log(
            `Inserted: Job ${jobID} period ${checkDate.toISOString()} IST-mapped`
          );
        }

        checkDate = incrementDateIST(checkDate, job.jobFrequency);
      }
    }

    // Return pending jobs only (no change needed)
    let pendingQuery = `
      SELECT 
        cjd.jobdone, cjd.CustomerJobID, cjd.CustomerID, cjd.JobID, cjd.JobDueDate,
        cjd.CompletedDate, cjd.EmployeeID, cjd.remarks, cjd.jobprogress, cjd.completed_flag,
        cm.customerName, jm.jobName, u.employeeName, cjm.jobFrequency
      FROM CustomerJobDone cjd
      JOIN CustomerMasters cm ON cjd.CustomerID = cm.CustomerID
      JOIN JobMasters jm ON cjd.JobID = jm.JobID
      JOIN Users u ON cjd.EmployeeID = u.id
      JOIN CustomerJobMaster cjm ON cjd.CustomerJobID = cjm.CustomerJobID
      WHERE cjd.completed_flag = 0
    `;
    if (!isAdmin) pendingQuery += " AND cjd.EmployeeID = @empID";
    pendingQuery += " ORDER BY cjd.JobDueDate";

    const pendingRequest = pool.request();
    if (!isAdmin) pendingRequest.input("empID", sql.Int, parseInt(empID, 10));
    const pendingResult = await pendingRequest.query(pendingQuery);
res.json({
  recordset: pendingResult.recordset,
  todayIST: moment().format("YYYY-MM-DD HH:mm:ss"),
});

  } catch (error) {
    console.error("❌ Error fetching or inserting customer jobs:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/customer-jobdone", async (req, res) => {
  try {
    const { jobdone, completedDate, completed_flag, remarks, jobprogress } =
      req.body;
    console.log(req.body);

    

    // ✅ Execute SQL Query with IDENTITY_INSERT
    await executeQuery(
      `
       
       UPDATE CustomerJobDone 
       SET completedDate = @completedDate, completed_flag = @completed_flag, remarks= @remarks, jobprogress=@jobprogress
       WHERE jobdone = @jobdone;

      `,
      [
        { name: "jobdone", type: sql.Int, value: jobdone },
        { name: "completed_flag", type: sql.Int, value: completed_flag },
        { name: "remarks", type: sql.NVarChar, value: remarks },
        { name: "jobprogress", type: sql.NVarChar, value: jobprogress },
        {
          name: "completedDate",
          type: sql.DateTimeOffset,
          value: completedDate,
        }, // ✅ Add this parameter
      ]
    );
    res.status(201).json({ message: "Job marked as completed successfully!" });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/billed-jobs", async (req, res) => {
  const isAdmin = req.query.flag === "true" || req.query.flag === "1";
  const empID = req.query.empID;
  console.log("empID:", empID);
  console.log("isAdmin:", isAdmin);
  console.log("req.body:", req.body);

  try {
    let query = `
      SELECT
        cjd.EmployeeID,
        cjd.JobDone,
        cjd.CustomerJobID,
        cm.customerName,
        jm.jobName,
        u.employeeName,
        cjd.CompletedDate,
        cjd.Bill_date,
        cjd.Bill_amount,
        cjd.BilledFlag
      FROM CustomerJobDone cjd
      JOIN CustomerMasters cm ON cjd.CustomerID = cm.CustomerID
      JOIN JobMasters jm ON cjd.JobID = jm.JobID
      JOIN Users u ON cjd.EmployeeID = u.ID
      WHERE cjd.BilledFlag = 0 AND cjd.completed_flag=1
    `;

    // Apply employee filter if NOT an admin
    if (!isAdmin) {
      console.log("Adding EmployeeID filter!");
      query += " AND cjd.EmployeeID = @empID";
    } else {
      console.log("No filter; showing all records (admin view)");
    }

    query += " ORDER BY cjd.CompletedDate DESC";

    const pool = await sql.connect();
    const request = pool.request();

    if (!isAdmin) {
      request.input("empID", sql.Int, parseInt(empID, 10));
      console.log("Parameter set: empID =", empID);
    }

    // Log query and params
    console.log("---------- EXECUTING QUERY ----------");
    console.log("Query:\n", query);
    if (!isAdmin) {
      console.log("Parameters:", { empID });
    } else {
      console.log("Parameters: (none)");
    }
    console.log("---------- END QUERY LOG ----------");

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching billed jobs:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.post("/api/billed-jobs", async (req, res) => {
  console.log("req", req.body);

  const { JobDone, billNumber, billDate, billAmount, remarksbilled } = req.body;

  if (!JobDone || !billNumber || !billDate || !billAmount || !remarksbilled) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input("JobDone", sql.Int, JobDone)
      .input("billNumber", sql.NVarChar, billNumber)
      .input("remarksbilled", sql.NVarChar, remarksbilled)
      .input("billDate", sql.Date, billDate)
      .input("billAmount", sql.Decimal(10, 2), billAmount)
      .query(
        `UPDATE CustomerJobDone 
         SET Bill_Amount = @billAmount,
             remarksbilled = @remarksbilled,
             Bill_No = @billNumber, 
             Bill_Date = @billDate, 
             BilledFlag = 1
         WHERE JobDone = @JobDone`
      );

    res.json({ message: "Bill updated successfully", result });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/completed-jobs", async (req, res) => {
  const isAdmin = req.query.flag === "true" || req.query.flag === "1";
  const empID = req.query.empID;
  console.log("empID:", empID);
  console.log("isAdmin:", isAdmin);
  console.log("req.body:", req.body);
  try {
    let query = `SELECT
        cjd.EmployeeID,
      cjd.JobDone,
          cjd.CustomerJobID,
          cm.customerName,
          jm.jobName,
          u.employeeName,
          cjd.CompletedDate,
          cjd.Bill_date,
          cjd.Bill_amount,
          cjd.BilledFlag
      FROM CustomerJobDone cjd
      JOIN CustomerMasters cm ON cjd.CustomerID = cm.CustomerID
      JOIN JobMasters jm ON cjd.JobID = jm.JobID
      JOIN Users u ON cjd.EmployeeID = u.ID
      WHERE cjd.BilledFlag = 1 AND cjd.PaymentFlag = 0 `;
    if (!isAdmin) {
      console.log("Adding EmployeeID filter!");
      query += " AND cjd.EmployeeID = @empID";
    } else {
      console.log("No filter; showing all records (admin view)");
    }

    query += " ORDER BY cjd.CompletedDate DESC";

    const pool = await sql.connect();
    const request = pool.request();

    if (!isAdmin) {
      request.input("empID", sql.Int, parseInt(empID, 10));
      console.log("Parameter set: empID =", empID);
    }

    // Log query and params
    console.log("---------- EXECUTING QUERY ----------");
    console.log("Query:\n", query);
    if (!isAdmin) {
      console.log("Parameters:", { empID });
    } else {
      console.log("Parameters: (none)");
    }
    console.log("---------- END QUERY LOG ----------");

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching completed jobs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/payments", async (req, res) => {
  console.log("Received payment request:", req.body);

  const { JobDone, paymentAmount, paymentDate, remarkspayment } = req.body;

  if (!JobDone || !paymentAmount || !paymentDate || !remarkspayment) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input("JobDone", sql.Int, JobDone)
      .input("remarkspayment", sql.NVarChar, remarkspayment)
      .input("paymentAmount", sql.Decimal(10, 2), paymentAmount)
      .input("paymentDate", sql.Date, paymentDate)
      .query(
        `UPDATE CustomerJobDone 
         SET Payment_Recd_amount = @paymentAmount,
             remarkspayment = @remarkspayment,
             Payment_Recd_date = @paymentDate, 
             PaymentFlag = 1
         WHERE JobDone = @JobDone`
      );

    res.json({ message: "Payment recorded successfully", result });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/payment-completed-jobs", async (req, res) => {
  const isAdmin = req.query.flag === "true" || req.query.flag === "1";
  const empID = req.query.empID;
  console.log("empID:", empID);
  console.log("isAdmin:", isAdmin);
  console.log("req.body:", req.body);

  try {
    let query = `SELECT
        cjd.EmployeeID,
      cjd.Remarks,
      cjd.JobDone,
          cjd.CustomerJobID,
          cm.customerName,
          jm.jobName,
          u.employeeName,
          cjd.CompletedDate,
          cjd.Bill_date,
          cjd.Bill_amount,
          cjd.Payment_Recd_date,
          cjd.Payment_Recd_amount,
          cjd.BilledFlag,
          cjd.PaymentFlag
      FROM CustomerJobDone cjd
      JOIN CustomerMasters cm ON cjd.CustomerID = cm.CustomerID
      JOIN JobMasters jm ON cjd.JobID = jm.JobID
      JOIN Users u ON cjd.EmployeeID = u.ID
      WHERE cjd.BilledFlag = 1 AND cjd.PaymentFlag = 1`;

    if (!isAdmin) {
      console.log("Adding EmployeeID filter!");
      query += " AND cjd.EmployeeID = @empID";
    } else {
      console.log("No filter; showing all records (admin view)");
    }

    query += " ORDER BY cjd.CompletedDate DESC";

    const pool = await sql.connect();
    const request = pool.request();

    if (!isAdmin) {
      request.input("empID", sql.Int, parseInt(empID, 10));
      console.log("Parameter set: empID =", empID);
    }

    // Log query and params
    console.log("---------- EXECUTING QUERY ----------");
    console.log("Query:\n", query);
    if (!isAdmin) {
      console.log("Parameters:", { empID });
    } else {
      console.log("Parameters: (none)");
    }
    console.log("---------- END QUERY LOG ----------");

    const result = await request.query(query);
    res.json(result.recordset);

    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching completed jobs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/upload-sales", async (req, res) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid data format or empty request." });
    }

    const pool = await sql.connect(config);

    for (const row of req.body) {
      if (!row || row.length < 10) {
        return res
          .status(400)
          .json({ error: "Please check the details. Fields cannot be empty." });
      }
      console.log("Uploading row:", row);

      await pool
        .request()
        .input("customerID", sql.NVarChar, row[0] || "")
        .input("FromDate", sql.Date, row[1] || null)
        .input("ToDate", sql.Date, row[2] || null)
        .input("customerType", sql.VarChar, row[3] || "")
        .input("ItemName", sql.VarChar, row[4] || null)
        .input("GSTRate", sql.Decimal(10, 2), row[5] || 0.0)
        .input("Invoice_value", sql.Decimal(15, 2), row[6] || 0.0)
        .input("Taxable_Value", sql.Decimal(10, 2), row[7] || 0.0)
        .input("CGST", sql.Decimal(10, 2), row[8] || 0.0)
        .input("SGST", sql.Decimal(10, 2), row[9] || 0.0)
        .input("Tax", sql.Decimal(10, 2), row[10] || 0.0)
        .input("Total_Amount", sql.Decimal(10, 2), row[11] || 0.0)

        .query(
          `INSERT INTO sales (customerID, FromDate, ToDate,customerType, ItemName, GSTRate, Invoice_value, Taxable_Value, CGST, SGST,Tax, Total_Amount) 
           VALUES (@customerID, @FromDate, @ToDate,@customerType, @ItemName, @GSTRate, @Invoice_value, @Taxable_Value, @CGST, @SGST, @Tax ,@Total_Amount)`
        );
    }

    res.json({ message: "Sales data uploaded successfully" });
  } catch (error) {
    console.error("Database error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error. Please try again later." });
  }
});

// Add to server.js
app.get("/api/health", (req, res) => {
  res.json({
    status: pool ? "healthy" : "unhealthy",
    dbConnected: !!pool,
    uptime: process.uptime(),
    todayIST: moment().format("YYYY-MM-DD HH:mm:ss"),
  });
});

// ==================== Server Setup ====================
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log("Server running on port ${PORT}"));
