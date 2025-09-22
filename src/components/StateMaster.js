import React, { useState, useEffect } from "react";
import axios from "axios";
import "./state.css";


const empID = localStorage.getItem("empID");
const flag = localStorage.getItem("flag");


const StateMaster = () => {
  const [selectedState, setSelectedState] = useState({
    StateName: "",
    CountryID: "",
  });

  const [states, setStates] = useState([]);
  const [countries, setCountries] = useState([]);
  const [editingStateID, setEditingStateID] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchStates();
    fetchCountries();
  }, []);

  const fetchStates = async () => {
    try {
      const response = await axios.get("https://103.38.50.149:5001/api/states");
      setStates(response.data);
    } catch (error) {
      console.error("Error fetching states:", error);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await axios.get(
        "https://103.38.50.149:5001/api/countries"
      );
      setCountries(response.data);
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  const handleChange = (e) => {
    setSelectedState({
      ...selectedState,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const updatedState = {
      StateName: selectedState.StateName,
      CountryID: parseInt(selectedState.CountryID, 10),
    };

    try {
      if (editingStateID) {
        await axios.put(
          `https://103.38.50.149:5001/api/states/${editingStateID}`,
          updatedState
        );
        setMessage("State updated successfully!");
      } else {
        await axios.post("https://103.38.50.149:5001/api/states", updatedState);
        setMessage("State added successfully!");
      }

      fetchStates();
      setSelectedState({ StateName: "", CountryID: "" });
      setEditingStateID(null);
    } catch (error) {
      if (error.response) {
        // ✅ Server responded with a status code outside the 2xx range
        if (error.response.status === 400) {
          setMessage(error.response.data.error || "State already exists.");
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
  };

  const handleEdit = (state) => {
    setSelectedState({
      StateName: state.StateName,
      CountryID: state.CountryID,
    });
    setEditingStateID(state.StateID);
  };

  const handleDelete = async (stateID) => {
    try {
      await axios.delete(`https://103.38.50.149:5001/api/states/${stateID}`);
      setMessage("State deleted successfully!");
      fetchStates();
    } catch (error) {
      console.error("Error deleting state:", error);
      setMessage("Error deleting state.");
    }
  };

  return (
    <div className="state-container">
      <h2>State Master</h2>
      {message && <p className="message">{message}</p>}

      {/* Form Section */}
      <form className="state-form" onSubmit={handleSubmit}>
        <div className="form-row">
          {" "}
          {/* Flex container */}
          {/* State Name Input */}
          <div className="form-group">
            <input
              type="text"
              name="StateName"
              value={selectedState.StateName || ""}
              placeholder="Enter State Name"
              onChange={handleChange}
              required
            />
          </div>
          {/* Country Name Dropdown */}
          <div className="form-group">
            <select
              name="CountryID"
              value={selectedState.CountryID || ""}
              onChange={handleChange}
              required
            >
              <option value="">Select Country</option>
              {countries.map((country) => (
                <option key={country.CountryID} value={country.CountryID}>
                  {country.CountryName}
                </option>
              ))}
            </select>
          </div>
          {/* Submit Button */}
          <div className="form-group">
            <button type="submit">
              {editingStateID ? "Update" : "Submit"}
            </button>
          </div>
        </div>
      </form>

      {/* State List Table */}
      {states.length > 0 && (
        <div className="state-list">
          <h3>State List</h3>
          <table>
            <thead>
              <tr>
                <th>State Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {states.map((state) => (
                <tr key={state.StateID}>
                  <td>{state.StateName}</td>
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(state)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(state.StateID)}
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

export default StateMaster;
