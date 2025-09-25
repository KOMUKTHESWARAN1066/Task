import React, { useState, useEffect, useRef  } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import "./CustomerJobMaster.css";


const empID = localStorage.getItem("empID");
const flag = localStorage.getItem("flag");

const Sales = () => {
  const [excelData, setExcelData] = useState([]);
  const [customerType,setCustomertype]=useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
const [customerID, setCustomerID] = useState("");
const [message, setMessage] = useState("");
const fileInputRef = useRef(null);



  const handleSalesUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const binaryStr = e.target.result;
      const workbook = XLSX.read(binaryStr, { type: "binary" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) {
        setExcelData([]);
        return;
      }

      setExcelData(jsonData.slice(1)); // Skip header
    };
    reader.readAsBinaryString(file);
  };

  const uploadSalesData = async () => {
    setMessage(""); // Clear previous messages
  
    if (!customerID ||!customerType || !fromDate || !toDate) {
      setMessage("Please enter Customer ID,Customer Type, From Date, and To Date.");
      return;
    }
  
    if (excelData.length === 0) {
      setMessage("No data to upload. Please select an Excel file.");
      return;
    }
  
    const finalPayload = excelData.map((row) => [
      customerID,
      fromDate,
      toDate,
      customerType,
      ...row, // item data from Excel
     

    ]);
  
    try {
      setMessage("UpLoading...")
      const response = await axios.post("https://103.38.50.149:5001/api/upload-sales", finalPayload, {
        headers: { "Content-Type": "application/json" },
      });
    
      setMessage("✅ Sales data uploaded successfully!");
      setCustomerID("");
      setCustomers("");
      setExcelData("");
      setFromDate("");
      setToDate("");
      setCustomertype("");
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // ✅ Clear file input
      }
      await fetchCustomers(); // Refresh customers after upload




    } catch (error) {
      console.error("Upload error:", error);
    
      // Check if the error response exists and has a message
      if (error.response && error.response.data && error.response.data.error) {
        setMessage(`❌ ${error.response.data.error}`);
      } else {
        setMessage("❌ Error uploading sales data. Please try again.");
      }
    }
  };    
  const fetchCustomers = async () => {
    setError("Order of Excel Data must be in the below table order.");
    try {
      const response = await axios.get("https://103.38.50.149:5001/api/customers");
      setCustomers(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };
  
  useEffect(() => {
    fetchCustomers(); // Load customers initially
  }, []);
  
   
  

  return (
    <div className="job-container">
      <h2>Purchase & Sales Data Upload</h2>
      {message && <p className="message">{message}</p>}

      <div className="form-group">
  <label>Customer Name:</label>
  <select
    name="customerID"
    value={customerID}
    onChange={(e) => setCustomerID(e.target.value)}
    required
  >
    <option value="">Select Customer</option>
    {customers.length > 0 ? (
      customers.map((customer) => (
        <option key={customer.customerID} value={customer.customerID }>
         {customer.customerName}
        </option>
      ))
    ) : (
      <option disabled>Loading customers...</option>
    )}
  </select>
</div><br />
<div className="form-group">
  <label>Customer Type:</label>
  <select
    name="customertype"
    value={customerType}
    onChange={(e) => setCustomertype(e.target.value)}
    required
  >
    <option value="">Select Customer Type</option>
   <option >Purchase</option>
   <option >Sale</option>
  </select>
</div>


      <br />

      <label>From Date: </label>
      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
      <br />  <br />

      <label>To Date: </label>
      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      <br /><br />

      <input type="file" accept=".xlsx, .xls" onChange={handleSalesUpload}  ref={fileInputRef} />
      <a href="/Book10.xlsx" download>
  <button style={{ width:'fit-content' }}>Download Sample Template</button>
</a>

      {excelData.length === 0 && error && (
        <p style={{ color: "blue", fontWeight: "bold" }}>{error}</p>
      )}

      <table className="values" border="1"> 
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Customer Type</th>
            <th>From Date</th>
            <th>To Date</th>
            <th>Item Name</th>
            <th>GST Rate</th>
            <th>Invoice VALUE</th>
            <th>Taxable Amount</th>
            <th>CGST</th>
            <th>SGST</th>
            <th>Tax</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {excelData.length > 0 ? (
            excelData.map((row, index) => (
              <tr key={index}>
                <td>{customerID}</td>
                <td>{customerType}</td>
                <td>{fromDate}</td>
                <td>{toDate}</td>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
                <td>{row[4]}</td>
                <td>{row[5]}</td>
                <td>{row[6]}</td>
                <td>{row[7]}</td>
             
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="11" style={{ textAlign: "center" }}>No data to display</td>
            </tr>
          )}
        </tbody>
      </table>

      {excelData.length > 0 && (
        <button onClick={uploadSalesData} style={buttonStyle}>Upload  Data</button>
      )}
    </div>
  );
};

const buttonStyle = {
  marginTop: "10px",
  padding: "10px",
  backgroundColor: "green",
  color: "white",
  border: "none",
  cursor: "pointer",
  width:"fit-content",
};

export default Sales;


















