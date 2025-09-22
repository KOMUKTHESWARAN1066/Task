import { useState, useEffect } from "react";
import axios from "axios";
import "./CustomerJobMaster.css";
import { exportToExcel } from "../utils/excelExport";
import downloadImg from "../img/download.png";

const empID = localStorage.getItem("empID");
const flag = localStorage.getItem("flag");

const Payment = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [message, setMessage] = useState("");
  const [remarkspayment, setremarkspayment] = useState("");

  // Fetch jobs from the backend
  const fetchJobs = async () => {
    try {
      const response = await axios.get(
        `https://103.38.50.149:5001/api/completed-jobs`,
        { params: { empID, flag } }
      );
      setJobs(response.data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDownloadExcel = () => {
    const formattedJobs = jobs.map((job) => ({
      "Customer Name": job.customerName,
      "Job Name": job.jobName,
      "Employee Name":job.employeeName ,
      "Job Completed Date": formatDate(job.CompletedDate),
      "Job Bill Date": formatDate(job.Bill_date),
      "Bill Amount":job.Bill_amount,
      "remarks":job.remarkspayment,
    }));



    exportToExcel(formattedJobs, "Pending_Payment_Jobs");
  };

  
  // Select job for payment
  const handlePaymentClick = (job) => {
    console.log("Selected job for payment:", job);
    setSelectedJob(job);
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]); // Default to today
  };

  // Submit payment details
  // Submit payment details
  const handleSubmit = async () => {
    if (!paymentAmount.trim() || !paymentDate.trim()) {
      alert("Please enter both payment amount and date.");
      return;
    }

    if (!selectedJob?.JobDone) {
      alert("Error: JobDone ID is missing. Please select a valid job.");
      return;
    }

    const paymentData = {
      JobDone: selectedJob.JobDone,
      paymentAmount: parseFloat(paymentAmount),
      paymentDate: paymentDate,
      remarkspayment:remarkspayment,
    };

    console.log(paymentData)
    try {
      const response = await axios.post(
        "https://103.38.50.149:5001/api/payments",
        paymentData
      );
      if (response.status === 200) {
        setMessage("Payment details recorded successfully.");
        setSelectedJob(null);
        setPaymentAmount("");
        setPaymentDate("");
        setremarkspayment("");
        fetchJobs(); // Refresh job list after payment
      }
    } catch (error) {
      setSelectedJob(null);
      setMessage(
        error.response?.data?.error || "Failed to update Payment status."
      );
      console.error("Error submitting payment:", error);
      alert("Failed to record payment. Please try again.");
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="job-container">
      <h2>Completed Jobs for Payment</h2>
        {/* 📌 Common Download Button */}
        <button className="download-btn" onClick={handleDownloadExcel}>
  <img src={downloadImg} alt="Download" />
</button>
      {message && <p className="message">{message}</p>}
      <table className="values">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Job Name</th>
            <th>Employee Name</th>
            <th style={{ width: "150px" }}>Completed Date</th>
            <th style={{ width: "150px" }}>Billed Date</th>
            <th>Billed Amount</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <tr key={job.JobDone}>
                <td>{job.customerName}</td>
                <td>{job.jobName}</td>
                <td>{job.employeeName}</td>
                <td>{formatDate(job.CompletedDate)}</td>
                <td>{formatDate(job.Bill_date)}</td>
                <td>{job.Bill_amount}</td>
                <td>
                  <button onClick={() => handlePaymentClick(job)}>
                    Enter Payment
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", color: "gray" }}>
                No completed jobs found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedJob && (
        <div className="popup">
          <div className="popup-content">
            <h3>Enter Payment Details</h3>

            <div style={{ marginBottom: "15px" }}>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                placeholder="Enter Payment Date"
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter Payment Amount"
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <input
                type="remarks"
                value={remarkspayment}
                onChange={(e) => setremarkspayment(e.target.value)}
                placeholder="Enter remarks"
              />
            </div>

            <div className="popup-buttons">
              <button onClick={handleSubmit}>Submit</button>
              <button onClick={() => setSelectedJob(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;
