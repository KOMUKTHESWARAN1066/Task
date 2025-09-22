import React, { useState, useEffect } from "react";
import axios from "axios";
import "./jobtype.css";


const empID = localStorage.getItem("empID");
const flag = localStorage.getItem("flag");


const JobMaster = () => {
  const [formData, setFormData] = useState({
    jobTypeID: "",
    jobName: "",
    frequency: "",
    recurringDate: "",
  });
  const [jobs, setJobs] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [message, setMessage] = useState("");

  // Fetch Job Types & Job Master List
  useEffect(() => {
    fetchJobTypes();
    fetchJobs();
  }, []);

  const fetchJobTypes = () => {
    axios
      .get("https://103.38.50.149:5001/api/jobtypes")
      .then((response) => setJobTypes(response.data))
      .catch((error) => console.error("Error fetching job types:", error));
  };

  const fetchJobs = () => {
    axios
      .get("https://103.38.50.149:5001/api/jobs")
      .then((response) => setJobs(response.data))
      .catch((error) => console.error("Error fetching jobs:", error));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
  
    let updatedValue = value;
    
    // Ensure date format is always YYYY-MM-DD
    if (name === "recurringDate") {
      updatedValue = value ? new Date(value).toISOString().split("T")[0] : "";
    }
  
    setFormData((prev) => ({ ...prev, [name]: updatedValue }));
  };
  
  const resetForm = () => {
    setFormData({
      jobTypeID: "",
      jobName: "",
      frequency: "",
      recurringDate: "",
    });
    setEditingIndex(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const jobTypeID = Number(formData.jobTypeID);
    if (isNaN(jobTypeID) || jobTypeID === 0) {
      alert("Invalid Job Type selected");
      return;
    }

    const newJob = {
      jobTypeID,
      jobName: formData.jobName,
      frequency: formData.frequency,
      recurringDate: formData.recurringDate,
    };

    if (editingIndex !== null) {
      const jobId = jobs[editingIndex]?.jobID || jobs[editingIndex]?.id;
      axios
        .put(`https://103.38.50.149:5001/api/jobs/${jobId}`, newJob)
        .then(() => {
          fetchJobs(); // Fetch updated job list
          resetForm();
        })
        .catch((error) => console.error("Error updating job:", error));
    } else {
      axios
        .post("https://103.38.50.149:5001/api/jobs", newJob)
        .then(() => {
          fetchJobs(); // Fetch updated job list
          resetForm();
        })
        .catch((error) => {
          if (error.response) {
            // Server responded with a status code outside the 2xx range
            if (error.response.status === 400) {
              setMessage(error.response.data.error || "Job already exists.");
            } else if (error.response.status === 500) {
              setMessage("Server error. Please try again later.");
            } else {
              setMessage(`Unexpected error: ${error.response.status}`);
            }
            console.error("API Error Response:", error.response.data);
          } else if (error.request) {
            // Request was made but no response received
            setMessage("No response from server. Check your network.");
            console.error("No response received:", error.request);
          } else {
            // Other unexpected errors
            setMessage("An unexpected error occurred.");
            console.error("Unexpected error:", error.message);
          }
        });

    }
  };
  const handleEdit = (index) => {
    const job = jobs[index];
    
    // Convert ISO Date to YYYY-MM-DD format
    const formattedDate = job.recurringDate ? job.recurringDate.split("T")[0] : "";
  
    setFormData({
      jobTypeID: String(job.jobTypeID),
      jobName: job.jobName,
      frequency: job.frequency,
      recurringDate: formattedDate, // Ensure correct date format
    });
    setEditingIndex(index);
  };
  
  const handleDelete = (index) => {
    const jobId = jobs[index]?.jobID || jobs[index]?.id;
    axios
      .delete(`https://103.38.50.149:5001/api/jobs/${jobId}`)
      .then(() => fetchJobs()) // Fetch updated job list
      .catch((error) => console.error("Error deleting job:", error));
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0"); // Ensure two digits
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  return (
    <div className="jobtype-container">
      <h2>Job Master</h2>
      {message && <p className="error-message">{message}</p>}
      <form className="jobtype-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Job Type:</label>
          <select
            name="jobTypeID"
            value={formData.jobTypeID}
            onChange={handleChange}
            required
          >
            <option value="">Select Job Type</option>
            {jobTypes.map((type) => (
              <option key={type.jobTypeID} value={type.jobTypeID}>
                {type.jobTypeName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Job Name:</label>
          <input
            type="text"
            name="jobName"
            value={formData.jobName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Frequency:</label>
          <select
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            required
          >
            <option value="">Select Frequency</option>
            <option value="One-Time">One Time</option>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Fortnightly">Fortnightly</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Half-Yearly">Half-Yearly</option>
            <option value="Annually">Annually</option>
          </select>
        </div>

        <div className="form-group">
          <label>Recurring Date:</label>
          <input
            type="date"
            name="recurringDate"
            value={formData.recurringDate}

            onChange={handleChange}
            required
          />
        </div>

        <button type="submit">
          {editingIndex !== null ? "Update" : "Submit"}
        </button>
      </form>

      {jobs.length > 0 && (
        <div className="jobtype-list">
          <h3>Job Master List</h3>
          <table>
            <thead>
              <tr>
                <th>Job Name</th>
                <th>Frequency</th>
                <th>Recurring Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, index) => (
                <tr key={index}>
                  <td>{job.jobName}</td>
                  <td>{job.frequency}</td>
                  <td>{formatDate(job.recurringDate)}</td>
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(index)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(index)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default JobMaster;
