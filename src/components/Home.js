import { useState, useEffect } from "react";
import axios from "axios";
import "./CustomerJobMaster.css";
import { exportToExcel } from "../utils/excelExport";
import downloadImg from "../img/download.png";

const Home = () => {
  // State declarations (unchanged)
  const [pendingJobs, setPendingJobs] = useState([]);
  const [billedJobs, setBilledJobs] = useState([]);
  const [paymentJobs, setPaymentJobs] = useState([]);
  const [completedPayments, setCompletedPayments] = useState([]);
  const [error, setError] = useState("");
  
  const [loading, setLoading] = useState(false); // <-- Loading state
  const [isAdmin, setIsAdmin] = useState(false); // Move isAdmin to state for dynamic handling

  // Summaries (updated to depend on state)
  const summarizeJobsByCustomer = (jobs) => {
    const summary = {};
    jobs.forEach(job => {
      const name = job.customerName || "Unknown Customer";
      summary[name] = (summary[name] || 0) + 1;
    });
    return summary;
  };

  const summarizeJobsByEmployee = (jobs) => {
    const summary = {};
    jobs.forEach(job => {
      const name = job.employeeName || "Unknown Employee";
      summary[name] = (summary[name] || 0) + 1;
    });
    return summary;
  };

  const pendingSummary = summarizeJobsByCustomer(pendingJobs);
  const billedSummary = summarizeJobsByCustomer(billedJobs);
  const paymentSummary = summarizeJobsByCustomer(paymentJobs);
  const completedSummary = summarizeJobsByCustomer(completedPayments);
  // Employee Summaries
  const pendingEmployeeSummary = summarizeJobsByEmployee(pendingJobs);
  const billedEmployeeSummary = summarizeJobsByEmployee(billedJobs);
  const paymentEmployeeSummary = summarizeJobsByEmployee(paymentJobs);
  const completedEmployeeSummary = summarizeJobsByEmployee(completedPayments);

  // Form States (unchanged)
  const [message, setMessage] = useState("");

  // Data Fetching: Read localStorage inside useEffect to ensure fresh values on mount
  useEffect(() => {
    const fetchAllData = async (empID, flag) => {
      try {
        setLoading(true);
        const pendingRes = await axios.get(
          "https://103.38.50.149:5001/api/pending-jobs",
          { params: { empID, flag } }
        );
        console.log("Pending Jobs Response:", pendingRes.data); // Enhanced logging for debugging
        // Flexible extraction: Handle if response is {recordset: [...]}, direct array, or other
        const pendingData = pendingRes.data.recordset || pendingRes.data || [];
        setPendingJobs(Array.isArray(pendingData) ? pendingData : []); // Ensure it's an array

        const billedRes = await axios.get(
          "https://103.38.50.149:5001/api/billed-jobs",
          { params: { empID, flag } }
        );
        console.log("Billed Jobs Response:", billedRes.data);
        const billedData = billedRes.data.recordset || billedRes.data || [];
        setBilledJobs(Array.isArray(billedData) ? billedData : []);

        const paymentRes = await axios.get(
          "https://103.38.50.149:5001/api/completed-jobs",
          { params: { empID, flag } }
        );
        console.log("Payment Jobs Response:", paymentRes.data);
        const paymentData = paymentRes.data.recordset || paymentRes.data || [];
        setPaymentJobs(Array.isArray(paymentData) ? paymentData : []);

        const completedRes = await axios.get(
          "https://103.38.50.149:5001/api/payment-completed-jobs",
          { params: { empID, flag } }
        );
        console.log("Completed Payments Response:", completedRes.data);
        const completedData = completedRes.data.recordset || completedRes.data || [];
        setCompletedPayments(Array.isArray(completedData) ? completedData : []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Check console for details.");
      } finally {
        setLoading(false); // Always stop loading, even on error
      }
    };

    // Read localStorage inside useEffect for fresh values
    const storedEmpID = localStorage.getItem("empID");
    const storedFlag = localStorage.getItem("flag");
    const adminStatus = storedFlag === "true" || storedFlag === "1";
    setIsAdmin(adminStatus);

    if (storedEmpID) {
      fetchAllData(storedEmpID, storedFlag);
    } else {
      // Optional: Handle no empID (e.g., redirect to login or show message)
      setError("User not authenticated. Please log in again.");
      setLoading(false);
    }
  }, []); // Empty dependency array: Run once on component mount

  // Common Format Date Function
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date"; // Handle invalid dates gracefully
    return `${date.getDate().toString().padStart(2, "0")}-${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${date.getFullYear()}`;
  };

  // Action Handlers and Download Functions (unchanged)
  const handleDownloadPendingJobs = () => {
    const formattedJobs = pendingJobs.map((job) => ({
      "Customer Name": job.customerName,
      "Job Name": job.jobName,
      "Job Frequency": job.jobFrequency,
      "Job Date": formatDate(job.JobDueDate || job.jobDate), // Flexible field name
      "Next Scheduled Date": formatDate(job.NextScheduledDate),
    }));
  
    exportToExcel(formattedJobs, "Pending_Jobs");
  };
  
  const handleDownloadCompletedJobs = () => {
    const formattedJobs = billedJobs.map((job) => ({
      "Customer Name": job.customerName,
      "Job Name": job.jobName,
      "Employee Name": job.employeeName,
      "Job Completed Date": formatDate(job.CompletedDate),
    }));
  
    exportToExcel(formattedJobs, "Completed_Jobs");
  };
  
  const handleDownloadPaymentPendingJobs = () => {
    const formattedJobs = paymentJobs.map((job) => ({
      "Customer Name": job.customerName,
      "Job Name": job.jobName,
      "Employee Name": job.employeeName,
      "Job Completed Date": formatDate(job.CompletedDate),
      "Job Bill Date": formatDate(job.Bill_date),
      "Bill Amount": job.Bill_amount,
    }));
  
    exportToExcel(formattedJobs, "Pending_Payment_Jobs");
  };
  
  const handleDownloadCompletedPayments = () => {
    const formattedJobs = completedPayments.map((job) => ({
      "Customer Name": job.customerName,
      "Job Name": job.jobName,
      "Employee Name": job.employeeName,
      "Job Completed Date": formatDate(job.CompletedDate),
      "Billed Date": formatDate(job.Bill_date),
      "Billed Amount": job.Bill_amount,
      "Amount Received Date": formatDate(job.Payment_Recd_date),
      "Received Amount": job.Payment_Recd_amount,
      "Remark": job.Remarks,
    }));
  
    exportToExcel(formattedJobs, "Completed_Payments");
  };

  // JSX Return (unchanged except using isAdmin state)
  return (
    <div className="job-container">
      {/* ------- Pending Jobs Section ------- */}
      <h2>Pending Jobs</h2>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <span>Loading, please wait...</span>
        </div>
      )}

      <button className="download-btn" onClick={handleDownloadPendingJobs}>
        <img src={downloadImg} alt="Download" />
      </button>
      {message && <p className="message">{message}</p>}

      <table className="values">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Job Name</th>
            <th>Job Frequency</th>
            <th>Job Date</th>
            <th>Next Scheduled Date</th>
          </tr>
        </thead>
        <tbody>
          {error ? (
            <tr>
              <td colSpan="6" style={{ color: "red", textAlign: "center" }}>
                {error}
              </td>
            </tr>
          ) : pendingJobs.length > 0 ? (
            pendingJobs.map(job => (
              <tr key={job.jobdone || job.JobDone || job.CustomerJobID || Math.random()}> {/* Flexible key to avoid errors */}
                <td>{job.customerName}</td>
                <td>{job.jobName}</td>
                <td>{job.jobFrequency}</td>
                <td>{formatDate(job.JobDueDate)}</td>
                <td>{formatDate(job.NextScheduledDate)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ color: "gray", textAlign: "center" }}>
                No jobs assigned.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summaries Side by Side */}
      <div className="summaries-container">
        <div className="summary-section">
          <h4>Summary by Customer</h4>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Total Pending Jobs</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pendingSummary).map(([customer, count]) => (
                <tr key={customer}>
                  <td>{customer}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isAdmin && (
          <div className="summary-section">
            <h4>Summary by Employee</h4>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Total Pending Jobs</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(pendingEmployeeSummary).map(([employee, count]) => (
                  <tr key={employee}>
                    <td>{employee}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <br />

      {/* ------- Completed Jobs Section ------- */}
      <h2>Completed Jobs</h2>

      <button className="download-btn" onClick={handleDownloadCompletedJobs}>
        <img src={downloadImg} alt="Download" />
      </button>
      <table className="values">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Job Name</th>
            <th>Employee</th>
            <th>Completed Date</th>
          </tr>
        </thead>
        <tbody>
          {billedJobs.length > 0 ? (
            billedJobs.map(job => (
              <tr key={job.jobdone || job.JobDone || job.CustomerJobID || Math.random()}>
                <td>{job.customerName}</td>
                <td>{job.jobName}</td>
                <td>{job.employeeName}</td>
                <td>{formatDate(job.CompletedDate)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ color: "gray", textAlign: "center" }}>
                No completed jobs.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summaries Side by Side */}
      <div className="summaries-container">
        <div className="summary-section">
          <h4>Summary by Customer</h4>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Total Completed Jobs</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(billedSummary).map(([customer, count]) => (
                <tr key={customer}>
                  <td>{customer}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isAdmin && (
          <div className="summary-section">
            <h4>Summary by Employee</h4>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Total Completed Jobs</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(billedEmployeeSummary).map(([employee, count]) => (
                  <tr key={employee}>
                    <td>{employee}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <br />

      {/* ------- Payment Pending Jobs Section ------- */}
      <h2>Completed Jobs for Payment</h2>

      <button className="download-btn" onClick={handleDownloadPaymentPendingJobs}>
        <img src={downloadImg} alt="Download" />
      </button>
      <table className="values">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Job Name</th>
            <th>Employee Name</th>
            <th style={{ width: "150px" }}>Completed Date</th>
            <th style={{ width: "150px" }}>Billed Date</th>
            <th>Billed Amount</th>
          </tr>
        </thead>
        <tbody>
          {paymentJobs.length > 0 ? (
            paymentJobs.map(job => (
              <tr key={job.jobdone || job.JobDone || job.CustomerJobID || Math.random()}>
                <td>{job.customerName}</td>
                <td>{job.jobName}</td>
                <td>{job.employeeName}</td>
                <td>{formatDate(job.CompletedDate)}</td>
                <td>{formatDate(job.Bill_date)}</td>
                <td>{job.Bill_amount}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "gray" }}>
                No completed jobs found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summaries Side by Side */}
      <div className="summaries-container">
        <div className="summary-section">
          <h4>Summary by Customer</h4>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Total Pending Payments</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(paymentSummary).map(([customer, count]) => (
                <tr key={customer}>
                  <td>{customer}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isAdmin && (
          <div className="summary-section">
            <h4>Summary by Employee</h4>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Total Pending Payments</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(paymentEmployeeSummary).map(([employee, count]) => (
                  <tr key={employee}>
                    <td>{employee}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <br />

      {/* ------- Completed Payments Section ------- */}
      <h2>Payment Completed Jobs</h2>

      {message && <p className="message">{message}</p>}
      
      <button className="download-btn" onClick={handleDownloadCompletedPayments}>
        <img src={downloadImg} alt="Download" />
      </button>
      <table className="values">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Job Name</th>
            <th>Employee Name</th>
            <th style={{ width: "150px" }}>Completed Date</th>
            <th style={{ width: "150px" }}>Billed Date</th>
            <th>Billed Amount</th>
            <th style={{ width: "150px" }}>Amount Received Date</th>
            <th>Amount Received</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {completedPayments.length > 0 ? (
            completedPayments.map(job => (
              <tr key={job.jobdone || job.JobDone || job.CustomerJobID || Math.random()}>
                <td>{job.customerName}</td>
                <td>{job.jobName}</td>
                <td>{job.employeeName}</td>
                <td>{formatDate(job.CompletedDate)}</td>
                <td>{formatDate(job.Bill_date)}</td>
                <td>{job.Bill_amount}</td>
                <td>{formatDate(job.Payment_Recd_date)}</td>
                <td>{job.Payment_Recd_amount}</td>
                <td>{job.Remarks}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="9" style={{ textAlign: "center", color: "gray" }}>
                No completed jobs found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summaries Side by Side */}
      <div className="summaries-container">
        <div className="summary-section">
          <h4>Summary by Customer</h4>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Total Payments Completed</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(completedSummary).map(([customer, count]) => (
                <tr key={customer}>
                  <td>{customer}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isAdmin && (
          <div className="summary-section">
            <h4>Summary by Employee</h4>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Total Payments Completed</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(completedEmployeeSummary).map(([employee, count]) => (
                  <tr key={employee}>
                    <td>{employee}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <br />
    </div>
  );
};

export default Home;
