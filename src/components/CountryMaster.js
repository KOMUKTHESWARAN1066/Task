import React, { useState, useEffect } from "react";
import axios from "axios";
import "./CountryMaster.css";


const empID = localStorage.getItem("empID");
const flag = localStorage.getItem("flag");

const CountryMaster = () => {
  const [formData, setFormData] = useState({ CountryID: "", CountryName: "" });
  const [countries, setCountries] = useState([]);
  const [editingID, setEditingID] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch countries from the database
  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "https://103.38.50.149:5001/api/countries"
      );
      setCountries(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching countries:", error);
      setLoading(false);
    }
  };

  // Handle input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submit (Add or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingID) {
        // Update existing country
        const response = await axios.put(
          `https://103.38.50.149:5001/api/countries/${editingID}`,
          {
            CountryName: formData.CountryName,
          }
        );
        if (response.data.success) {
          setMessage("Country updated successfully!");
        }
        setMessage("Country updated successfully!");
      } else {
        // Add new country
        const response = await axios.post(
          "https://103.38.50.149:5001/api/countries",
          {
            CountryName: formData.CountryName,
          }
        );
        if (response.data.success) {
          setMessage("Country added successfully!");
        }
      }
      setMessage("Country added successfully!");
      fetchCountries(); // Refresh the list
    } catch (error) {
      if (error.response) {
        // ✅ Server responded with an error status code
        if (error.response.status === 400) {
          setMessage(error.response.data.error || "Country already exists.");
        } else if (error.response.status === 500) {
          setMessage("Server error. Please try again later.");
        } else {
          setMessage(`Unexpected error: ${error.response.status}`);
        }
        console.error("API Error Response:", error.response.data);
      } else if (error.request) {
        // ✅ Request was made, but no response received
        setMessage("No response from server. Check your network connection.");
        console.error("No response received:", error.request);
      } else {
        // ✅ Other unexpected errors
        setMessage("An unexpected error occurred.");
        console.error("Unexpected error:", error.message);
      }
    }

    setFormData({ CountryID: "", CountryName: "" }); // Reset form
    setEditingID(null);
  };

  // Handle Edit
  const handleEdit = (country) => {
    setFormData({
      CountryID: country.CountryID,
      CountryName: country.CountryName,
    });
    setEditingID(country.CountryID);
  };

  // Handle Delete
  const handleDelete = async (CountryID) => {
    if (!CountryID) {
      console.error("Error: CountryID is undefined");
      return;
    }

    try {
      await axios.delete(
        `https://103.38.50.149:5001/api/countries/${CountryID}`
      );
      setMessage("Country deleted successfully!");
      fetchCountries(); // Refresh the list
    } catch (error) {
      console.error("Error deleting country:", error);
      setMessage(
        error.response?.data?.error ||
          "This country has associated states. Delete the states first."
      );
    }
  };

  return (
    <div className="country-container">
      <h2>Country Master</h2>
      {message && <p className="message">{message}</p>}

      <form className="country-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Country Name:</label>
          <input
            type="text"
            name="CountryName"
            value={formData.CountryName || ""}
            placeholder="Enter Country Name"
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group full-width">
          <button type="submit">{editingID ? "Update" : "Submit"}</button>
        </div>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        countries.length > 0 && (
          <div className="country-list">
            <h3>Countries List</h3>
            <table>
              <thead>
                <tr>
                  <th>Country Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((country) => (
                  <tr key={country.CountryID}>
                    <td>{country.CountryName}</td>
                    <td>
                      <button onClick={() => handleEdit(country)}>Edit</button>
                      <button
                        onClick={() => handleDelete(country.CountryID)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default CountryMaster;
