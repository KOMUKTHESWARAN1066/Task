import { useState, useEffect } from "react";
import axios from "axios";
import "./CustomerJobMaster.css";
import { exportToExcel } from "../utils/excelExport";
import downloadImg from "../img/download.png";


const empID = localStorage.getItem("empID");
const flag = localStorage.getItem("flag");

const Billed = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [billDate, setBillDate] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [remarksbilled, setremarksbilled] = useState("");
  const [message, setMessage] = useState("");

  // Fetch jobs from the backend

  const fetchJobs = async () => {
    try {
      console.log(empID,flag)
      const response = await axios.get(
        `https://103.38.50.149:5001/api/billed-jobs`,
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
      "Employee Name": job.employeeName,
      "Job Completed Date": formatDate(job.CompletedDate),
     
    }));

 

    exportToExcel(formattedJobs, "Pending_Bill_Jobs");
  };
  // Select job for billing
  const handleBillClick = (job) => {
    console.log("Selected job for billing:", job); // Debugging
    setSelectedJob(job);
    setBillAmount("");
    setBillNumber("");
    setremarksbilled("");
    setBillDate(new Date().toISOString().split("T")[0]); // Default to today
  };

  // Submit billing details
  const handleSubmit = async () => {
    if (!billAmount.trim() || !billNumber.trim() || !billDate.trim()) {
      alert("Please enter all billing details.");
      return;
    }

    if (!selectedJob?.JobDone) {
      alert("Error: JobDone ID is missing. Please select a valid job.");
      return;
    }

    const requestData = {
      JobDone: selectedJob.JobDone, // Ensure JobDone is included
      billNumber: billNumber.trim(),
      billDate: billDate,
      remarksbilled: remarksbilled,
      billAmount: parseInt(billAmount),
    };

   

    try {
      const response = await axios.post(
        "https://103.38.50.149:5001/api/billed-jobs",
        requestData
      );
      console.log("Response from backend:", response.data);
      console.log("Response from frontend:", requestData);

      setMessage(response.data.message);
      setSelectedJob(null);

      setJobs(
        jobs.map((job) =>
          job.JobDone === selectedJob.JobDone
            ? { ...job, billAmount: parseFloat(billAmount) }
            : job
        )
      );

      fetchJobs();
    } catch (error) {
      setSelectedJob(null);
      setMessage(error.response?.data?.error || "Failed to update Bill status.");
      console.error("Error updating bill:", error.response?.data || error);
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
      <h2>Completed Jobs for Billing</h2>
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
            <th>Completed Date</th>
            <th>Billing</th>
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
                <td>
                  <button onClick={() => handleBillClick(job)}>
                    Enter Bill
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", color: "gray" }}>
                No jobs found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedJob && (
        <div className="popup">
          <div className="popup-content">
            <h3>Enter Bill Details</h3>

            <div style={{ marginBottom: "15px" }}>
              <input
                type="number"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="Enter Bill Number"
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                placeholder="Enter Date"
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <input
                type="number"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <input
                type="remarks"
                value={remarksbilled}
                onChange={(e) => setremarksbilled(e.target.value)}
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

export default Billed;
