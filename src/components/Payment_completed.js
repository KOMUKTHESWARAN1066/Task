import { useState, useEffect } from "react";
import axios from "axios";
import "./CustomerJobMaster.css";
import downloadImg from "../img/download.png";
import { exportToExcel } from "../utils/excelExport";


const empID = localStorage.getItem("empID");
const flag = localStorage.getItem("flag");

const Payment = () => {
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState("");

  // Fetch jobs from the backend
  const fetchJobs = async () => {
    try {
      const response = await axios.get(
        `https://103.38.50.149:5001/api/payment-completed-jobs`,
        { params: { empID, flag } }
      );
      setJobs(response.data);
      console.log("Fetched jobs:", response.data); // Debugging
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
      "Billed Date":job.Bill_date,
      "Billed Amount":job.Bill_amount,
      "Amount Received Date": formatDate(job.Payment_Recd_date),
      "Received Amount":job.Payment_Recd_amount,
      "Remark":job.Remarks,
    }));
    exportToExcel(formattedJobs, "Completed_Jobs");
  };


  // Select job for payment

  // Submit payment details
  // Submit payment details

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
      <h2>Completed Jobs </h2>
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
            <th style={{ width: "150px" }}>Amount Received Date</th>
            <th>Amount Received</th>
            <th>Remarks</th>
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
                <td>{formatDate(job.Payment_Recd_date)}</td>
                <td>{job.Payment_Recd_amount}</td>
                <td>{job.Remarks}</td>
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
    </div>
  );
};

export default Payment;
