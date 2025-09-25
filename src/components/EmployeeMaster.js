import React, { useState, useEffect } from "react";
import axios from "axios";
import "./EmployeeMaster.css";
import { v4 as uuidv4 } from "uuid";

const API_BASE_URL = "https://103.38.50.149:5001/api/employees";
const empID = localStorage.getItem("empID");
const flag = localStorage.getItem("flag");

const EmployeeMaster = () => {
  const [employeeID] = useState(uuidv4()); // Generate unique ID for new employees
  const [formData, setFormData] = useState({
    employeeName: "",
    dateOfBirth: "",
    fatherName: "",
    motherName: "",
    dateOfJoining: "",
    phoneNumber: "",
    emergencyNumber: "",
    mailID: "",
    permanentAddress: "",
    presentAddress: "",
    panNo: "",
    aadharNo: "",
    maritalStatus: "",
    qualification: "",
    username: "",
    password: "",
    active: "Y"
  });

  const [employees, setEmployees] = useState([]);
  const [editingID, setEditingID] = useState(null);
  const [message, setMessage] = useState("");

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      setEmployees(response.data);
      console.log(response.data)
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle form submit (Add or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingID) {
        // Update Employee
        response = await axios.put(`${API_BASE_URL}/${editingID}`, formData);
      } else {
        // Add Employee
        console.log(formData)
        response = await axios.post(API_BASE_URL, {
          employeeID,
          ...formData
        });
      }

      if (response.status === 201 || response.status === 200) {
        setMessage(response.data.message);
      }
      fetchEmployees();
      resetForm();
    } catch (error) {
      if (error.response) {
        console.error("Error:", error.response.data);
        if (error.response.status === 400) {
          const errorMessage = error.response.data.error || "Employee already exists.";
          setMessage(errorMessage);
        } else if (error.response.status === 404) {
          setMessage("No employees found.");
        } else if (error.response.status === 500) {
          setMessage("Server error. Please try again later.");
        } else {
          setMessage(`Unexpected error: ${error.response.status}`);
        }
      } else {
        setMessage("Network error. Please check your connection.");
      }
    }
  };

  // Reset Form
  const resetForm = () => {
    setFormData({
      employeeName: "",
      dateOfBirth: "",
      fatherName: "",
      motherName: "",
      dateOfJoining: "",
      phoneNumber: "",
      emergencyNumber: "",
      mailID: "",
      permanentAddress: "",
      presentAddress: "",
      panNo: "",
      aadharNo: "",
      maritalStatus: "",
      qualification: "",
      username: "",
      password: "",
      active: "Y"
    });
    setEditingID(null);
  };

  // Handle Edit
  const handleEdit = (employee) => {
    setFormData({
      employeeName: employee.employeeName || "",
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : "",
      fatherName: employee.fatherName || "",
      motherName: employee.motherName || "",
      dateOfJoining: employee.dateOfJoining ? employee.dateOfJoining.split('T')[0] : "",
      phoneNumber: employee.phoneNumber || "",
      emergencyNumber: employee.emergencyNumber || "",
      mailID: employee.mailID || "",
      permanentAddress: employee.permanentAddress || "",
      presentAddress: employee.presentAddress || "",
      panNo: employee.panNo || "",
      aadharNo: employee.aadharNo || "",
      maritalStatus: employee.maritalStatus || "",
      qualification: employee.qualification || "",
      username: employee.username || "",
      password: "", // Don't prefill password for security
      active: employee.active || "Y"
    });
    setEditingID(employee.id);
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (!id) {
      console.error("Error: Employee ID is undefined");
      return;
    }
    if (id === "1033") {
      setMessage("You don't have rights to delete an admin.");
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/${id}`);
      setEmployees((prevEmployees) =>
        prevEmployees.filter((emp) => emp.id !== id)
      );
      setMessage("Employee deleted successfully.");
      resetForm();
    } catch (error) {
      console.error("Error deleting employee:", error);
      setMessage("Error deleting employee. Employee may be assigned to jobs.");
    }
  };

  return (
    <div className="employee-master-container">
      <h2>Employee Master</h2>
      
      {message && <div className="message">{message}</div>}

      <form onSubmit={handleSubmit} className="employee-form">
        <div className="form-grid">
          {/* Personal Information */}
          <div className="form-group">
            <label>Employee Name *</label>
            <input
              type="text"
              name="employeeName"
              value={formData.employeeName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Father Name</label>
            <input
              type="text"
              name="fatherName"
              value={formData.fatherName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Mother Name</label>
            <input
              type="text"
              name="motherName"
              value={formData.motherName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Date of Joining</label>
            <input
              type="date"
              name="dateOfJoining"
              value={formData.dateOfJoining}
              onChange={handleChange}
            />
          </div>

          {/* Contact Information */}
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Emergency Number</label>
            <input
              type="tel"
              name="emergencyNumber"
              value={formData.emergencyNumber}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Mail ID</label>
            <input
              type="email"
              name="mailID"
              value={formData.mailID}
              onChange={handleChange}
            />
          </div>

          {/* Address Information */}
          <div className="form-group full-width">
            <label>Permanent Address</label>
            <textarea
              name="permanentAddress"
              value={formData.permanentAddress}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-group full-width">
            <label>Present Address</label>
            <textarea
              name="presentAddress"
              value={formData.presentAddress}
              onChange={handleChange}
              rows="3"
            />
          </div>

          {/* Document Information */}
          <div className="form-group">
            <label>PAN No</label>
            <input
              type="text"
              name="panNo"
              value={formData.panNo}
              onChange={handleChange}
              maxLength="10"
            />
          </div>

          <div className="form-group">
            <label>Aadhar No</label>
            <input
              type="text"
              name="aadharNo"
              value={formData.aadharNo}
              onChange={handleChange}
              maxLength="12"
            />
          </div>

          {/* Personal Details */}
          <div className="form-group">
            <label>Marital Status</label>
            <select
              name="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleChange}
            >
              <option value="">Select Status</option>
              <option value="Married">Married</option>
              <option value="Unmarried">Unmarried</option>
            </select>
          </div>

          <div className="form-group">
            <label>Qualification</label>
            <input
              type="text"
              name="qualification"
              value={formData.qualification}
              onChange={handleChange}
            />
          </div>

          {/* Login Credentials */}
          <div className="form-group">
            <label>User ID/Username *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!editingID} // Required only for new employees
              placeholder={editingID ? "Leave blank to keep current password" : ""}
            />
          </div>

          <div className="form-group">
            <label>Active</label>
            <select
              name="active"
              value={formData.active}
              onChange={handleChange}
            >
              <option value="Y">Yes</option>
              <option value="N">No</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingID ? "Update Employee" : "Add Employee"}
          </button>
          <button type="button" onClick={resetForm} className="btn-secondary">
            Reset
          </button>
        </div>
      </form>

      {/* Employee List Table */}
      {employees.length > 0 && (
        <div className="employee-table-container">
          <h3>Employee List</h3>
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Date of Birth</th>
                <th>Father Name</th>
                <th>Phone Number</th>
                <th>Mail ID</th>
                <th>PAN No</th>
                <th>Marital Status</th>
                <th>Username</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.employeeName}</td>
                  <td>{employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : ''}</td>
                  <td>{employee.fatherName}</td>
                  <td>{employee.phoneNumber}</td>
                  <td>{employee.mailID}</td>
                  <td>{employee.panNo}</td>
                  <td>{employee.maritalStatus}</td>
                  <td>{employee.username}</td>
                  <td>{employee.active}</td>
                  <td>
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(employee)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(employee.id)}
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

export default EmployeeMaster;
