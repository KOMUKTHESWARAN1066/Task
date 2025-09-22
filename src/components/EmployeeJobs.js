import { useState, useEffect } from "react";
import axios from "axios";
import "./CustomerJobMaster.css";

const empID = localStorage.getItem("empID");
const flag = localStorage.getItem("flag");

const EmployeeJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [progressDraftCache, setProgressDraftCache] = useState({});
  const [remark, setRemark] = useState("");
  const [message, setMessage] = useState("");
  const [isProgressUpdate, setIsProgressUpdate] = useState(false);
  const [loading, setLoading] = useState(false); // <-- Loading state

  useEffect(() => {
    if (empID) {
      fetchJobs();
    }
    // eslint-disable-next-line
  }, [empID]);
  const fetchJobs = async () => {
    setLoading(true);  // Start loading
    try {
      const response = await axios.get(
        `https://103.38.50.149:5001/api/pending-jobs`,
        { params: { empID, flag } }
      );
      console.log(response)
      setJobs(response.data.recordset);
      console.log("customername",jobs.customerName)
      setError("");
    } catch (error) {
      setError("Failed to load jobs.");
    }
    setLoading(false); // Stop loading
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleJobProgressClick = (job) => {
    setSelectedJob(job);
    setIsProgressUpdate(true);
    setProgressDraftCache((prev) => ({
      ...prev,
      [job.jobdone]: prev[job.jobdone] ?? (job.jobprogress || "")
    }));
  };

  const handleCompleteClick = (job) => {
    setSelectedJob(job);
    setIsProgressUpdate(false);
    setRemark("");
  };

  const handleProgressInputChange = (e) => {
    const value = e.target.value;
    if (!selectedJob) return;
    setProgressDraftCache((prev) => ({
      ...prev,
      [selectedJob.jobdone]: value
    }));
  };

  const handleSaveProgress = () => {
    setSelectedJob(null);
    setIsProgressUpdate(false);
    setMessage("Progress cached. Submit job as 'Completed' to finalize.");
  };

  const handleSubmitComplete = async () => {
    if (!remark.trim()) {
      alert("Please enter remark before submitting.");
      return;
    }
    const jobdone = selectedJob?.jobdone;
    const jobprogress = progressDraftCache[jobdone] ?? (selectedJob?.jobprogress || "");

    if (!jobdone) {
      alert("Job row unique ID ('jobdone') not found in the record. Cannot update.");
      return;
    }

    const todayDate = new Date().toISOString();
    const requestData = {
      jobdone,
      completedDate: todayDate,
      completed_flag: 1,
      remarks: remark,
      jobprogress: jobprogress
    };

    try {
      setLoading(true); // Show loading spinner
      const response = await axios.post(
        "https://103.38.50.149:5001/api/customer-jobdone",
        requestData
      );
      setMessage(response.data.message);
      setJobs((prevJobs) => prevJobs.filter((job) => job.jobdone !== jobdone));
      setProgressDraftCache((prev) => {
        const copy = { ...prev };
        delete copy[jobdone];
        return copy;
      });
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to complete job.");
    }
    setLoading(false); // Hide loading spinner
    setSelectedJob(null);
    setIsProgressUpdate(false);
    setRemark("");
  };

  return (
    <div className="job-container">
      <h2>Pending Jobs</h2>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <span>Loading, please wait...</span>
        </div>
      )}

      {message && <p className="message">{message}</p>}
      <table className="values">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Job Name</th>
            <th>Job Frequency</th>
            <th>Due Date</th>
            <th>Update Job Progress</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {error ? (
            <tr>
              <td colSpan="6" style={{ color: "red", textAlign: "center" }}>
                {error}
              </td>
            </tr>
          ) : jobs.length > 0 ? (
            jobs.map((job) => (
              <tr key={job.jobdone}>
                <td>{job.customerName}</td>
                <td>{job.jobName}</td>
                <td>{job.jobFrequency}</td>
                <td>{formatDate(job.JobDueDate)}</td>
                <td>
                  <button onClick={() => handleJobProgressClick(job)}>
                    Update Progress
                  </button>
                </td>
                <td>
                  <button onClick={() => handleCompleteClick(job)}>
                    Completed
                  </button>
                </td>
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

      {selectedJob && (
        <div className="popup">
          <div className="popup-content">
            <h3>
              {isProgressUpdate ? "Update Job Progress" : "Enter Completion Remark"}
            </h3>
            {isProgressUpdate ? (
              <textarea
                value={
                  progressDraftCache[selectedJob.jobdone] ??
                  selectedJob.jobprogress ??
                  ""
                }
                onChange={handleProgressInputChange}
                placeholder="Append new update here (existing progress will be shown)"
                rows={6}
                style={{ width: "100%" }}
              />
            ) : (
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Enter remarks"
                rows={4}
                style={{ width: "100%" }}
              />
            )}
            <div className="popup-buttons">
              {isProgressUpdate ? (
                <button onClick={handleSaveProgress}>Save</button>
              ) : (
                <button onClick={handleSubmitComplete}>Submit</button>
              )}
              <button
                onClick={() => {
                  setSelectedJob(null);
                  setIsProgressUpdate(false);
                  setRemark("");
                }}
              >
                Cancel
              </button>
            </div>
            {isProgressUpdate && (
              <div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
                <b>Note:</b> Progress is cached locally. Submit the job as <b>Completed</b> to save all updates to the backend.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeJobs;
