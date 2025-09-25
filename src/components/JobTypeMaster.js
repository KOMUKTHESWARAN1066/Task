import React, { useState, useEffect } from "react";
import axios from "axios";
import "./jobtype.css";


const empID = localStorage.getItem("empID");
const flag = localStorage.getItem("flag");


const JobMaster = () => {
  const [formData, setFormData] = useState({
    jobName: "",
  });

  const [jobs, setJobs] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingJobTypeId, setEditingJobTypeId] = useState(null);
  const [message, setMessage] = useState("");

  const API_URL = "https://103.38.50.149:5001/api/jobtypes"; // Adjust if your backend runs on a different port

  // **Fetch Job Types from API**
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(API_URL);
      setJobs(response.data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // **Handle Create/Update Job Type**
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingIndex !== null) {
        // **Update Job Type**
        await axios.put(`${API_URL}/${editingJobTypeId}`, formData);
        fetchJobs();
        setEditingIndex(null);
        setEditingJobTypeId(null);
      } else {
        // **Create New Job Type**
        await axios.post(API_URL, formData);
        fetchJobs();
      }

      setFormData({ jobTypeName: "" });
      setMessage(""); // Clear any previous error messages
    } catch (error) {
      if (error.response) {
        // Server responded with a status code outside the 2xx range
        if (error.response.status === 400) {
          setMessage(error.response.data.error || "JobType already exists.");
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
    }
  };

  // **Handle Edit Job Type**
  const handleEdit = (index) => {
    const job = jobs[index];
    setFormData({ jobTypeName: job.jobTypeName });
    setEditingIndex(index);
    setEditingJobTypeId(job.jobTypeID);
  };

  // **Handle Delete Job Type**
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchJobs();
    } catch (error) {
      console.error("Error deleting job:", error);
      setMessage("Failed to delete JobType. Please try again.");
    }
  };

  return (
    <div className="job-container">
      <h2>Job Type Master</h2>
      {message && <p className="message">{message}</p>}
      <form className="job-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Job Type Name:</label>
          <input
            type="text"
            name="jobTypeName"
            value={formData.jobTypeName}
            placeholder="Enter Job Type Name"
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group full-width">
          <button type="submit">
            {editingIndex !== null ? "Update" : "Submit"}
          </button>
        </div>
      </form>

      {/* Display Job List */}
      {jobs.length > 0 && (
        <div className="job-list">
          <h3>Job List</h3>
          <table>
            <thead>
              <tr>
                <th>Job Type Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, index) => (
                <tr key={job.jobTypeID}>
                  <td>{job.jobTypeName}</td>
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(index)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(job.jobTypeID)}
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
