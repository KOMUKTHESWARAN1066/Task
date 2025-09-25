import React, { useState, useEffect } from "react";
import axios from "axios";
import "./CustomerMaster.css";
import { v4 as uuidv4 } from "uuid";


const empID = localStorage.getItem("empID");
const flag = localStorage.getItem("flag");

const CustomerMaster = () => {
  const [customerID] = useState(uuidv4()); // Generate a unique ID
  const [formData, setFormData] = useState({
    TypeOfCustomer:"",
    customerName: "",
    address1: "",
    address2: "",
    address3: "",
    city: "",
    stateID: "",
    countryID: "",
    pincode: "",
    gstNo: "",
    tanNo: "",
    pfNo: "",
    esiNo: "",
    panNo: "",
    mobileNo: "",
    Authorized_Person: "",
    Authorized_Person_Contant_Number: "",
    Authorized_Person_Mail_Id: "",
    emailID: "",
    active: "Y",
  });

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchCountries();
    fetchCustomers();
  }, []);

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

  const fetchStates = async (countryID) => {
    try {
      console.log("Fetching states for country:", countryID);
      const response = await axios.get(
        `https://103.38.50.149:5001/api/states/${countryID}`
      );
      
      setStates(response.data);
    } catch (error) {
      console.error("Error fetching states:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(
        "https://103.38.50.149:5001/api/customers"
      );
      console.log(response.data)
      setCustomers(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => {
      let updatedData = { ...prevData, [name]: value };

      if (name === "countryID") {
        const selectedCountry = countries.find((c) => c.CountryID === value);
        updatedData = {
          ...updatedData,
          countryName: selectedCountry ? selectedCountry.CountryName : "",
          stateID: "", // Reset State when Country changes
          stateName: "",
        };
        fetchStates(value);
      }

      if (name === "stateID") {
        const selectedState = states.find((s) => s.StateID === value);
        updatedData = {
          ...updatedData,
          stateName: selectedState ? selectedState.StateName : "",
        };
      }

      return updatedData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "https://103.38.50.149:5001/api/customers",
        {
          customerID,
          ...formData,
        }
      );
      console.log(response.data)

      if (response.data.success) {
        setMessage("Customer added successfully!");
        fetchCustomers(); // Refresh customer list
      } else {
        setMessage("Failed to add customer.");
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setMessage("customer already exists.");
      } else {
        console.error("Error saving customer:", error);
        setMessage("Error saving customer.");
      }
    }
  };

  return (
    <div>
      {/* Customer Form */}
      <div className="customer-container">
        <h2>Customer Details</h2>
        {message && <p className="message">{message}</p>}
        <form className="customer-form" onSubmit={handleSubmit}>
          <div className="form-group" style={{ display: "none" }}>
            <label>Customer ID:</label>
            <input type="text" value={customerID} disabled />
          </div>
          <div className="form-group">
            <label>Type Of Customer:</label>
            <select name="TypeOfCustomer" onChange={handleChange}>
              <option value="">Select Type Of Customer</option>
              <option value="Individual">Individual</option>
              <option value="Proprietor">Proprietor</option>
              <option value="Partnership">Partnership</option>
              <option value="Private_Limited">Private Limited</option>
              <option value="Public_Limited">Public Limited</option>
              <option value="Society">Society</option>
              <option value="Trust">Trust</option>
              <option value="HUF">HUF</option>
            </select>
          </div>
          <div className="form-group">
            <label>Customer Name:</label>
            <input
              type="text"
              name="customerName"
              placeholder="Enter Name"
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Address 1:</label>
            <input
              type="text"
              name="address1"
              placeholder="Enter Address"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Address 2:</label>
            <input
              type="text"
              name="address2"
              placeholder="Enter Address"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Address 3:</label>
            <input
              type="text"
              name="address3"
              placeholder="Enter Address"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>City:</label>
            <input
              type="text"
              name="city"
              placeholder="Enter City"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Country:</label>
            <select name="countryID" onChange={handleChange} required>
              <option value="">Select Country</option>
              {countries && countries.length > 0 ? (
                countries.map((country) => (
                  <option key={country.CountryID} value={country.CountryID}>
                    {country.CountryName}
                  </option>
                ))
              ) : (
                <option disabled>Loading countries...</option>
              )}
            </select>
          </div>
          <div className="form-group">
            <label>State:</label>
            <select name="stateID" onChange={handleChange} required>
              <option value="">Select state</option>
              {states && states.length > 0 ? (
                states.map((State) => (
                  <option key={State.StateID} value={State.StateID}>
                    {State.StateName}
                  </option>
                ))
              ) : (
                <option disabled>
                  {" "}
                  No states available for the selected country.
                </option>
              )}
            </select>
          </div>
          <div className="form-group">
            <label>Pincode:</label>
            <input
              type="text"
              name="pincode"
              placeholder="Enter Pincode"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>PAN No:</label>
            <input
              type="text"
              name="panNo"
              placeholder="Enter PAN No"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>GST No:</label>
            <input
              type="text"
              name="gstNo"
              placeholder="Enter GST No"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>TAN No:</label>
            <input
              type="text"
              name="tanNo"
              placeholder="Enter TAN No"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>PF No:</label>
            <input
              type="text"
              name="pfNo"
              placeholder="Enter PF No"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>ESI No:</label>
            <input
              type="text"
              name="esiNo"
              placeholder="Enter ESI No"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Mobile No:</label>
            <input
              type="text"
              name="mobileNo"
              placeholder="Enter Mobile No"
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Email ID:</label>
            <input
              type="email"
              name="emailID"
              placeholder="Enter Email ID"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Authorized Person:</label>
            <input
              type="Authorized_Person"
              name="Authorized_Person"
              placeholder="Authorized Person"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Authorized Person Contant Number :</label>
            <input
              type="Authorized_Person_Contant_Number"
              name="Authorized_Person_Contant_Number"
              placeholder="Authorized Person Contant Number"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Authorized Person Mail Id :</label>
            <input
              type="Authorized_Person_Mail_Id"
              name="Authorized_Person_Mail_Id"
              placeholder="Authorized Person Mail Id"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Active:</label>
            <select name="active" onChange={handleChange}>
              <option value="">Select Active</option>
              <option value="Y">Yes</option>
              <option value="N">No</option>
            </select>
          </div>
          <div className="form-group full-width">
            <button type="submit">Submit</button>
          </div>
        </form>
      </div>

      {/* Customer List - Separate from Form */}
      <div className="customer-list-container">
        <h2>Customer List</h2>
        <table border="1">
          <thead>
            <tr>
              <th>Type Of Customer</th>
              <th>Customer Name</th>
              <th>Address</th>
              <th>City</th>
              <th>State ID</th>
              <th>Country ID</th>
              <th>Pincode</th>
              <th>GST No</th>
              <th>TAN No</th>
              <th>PF No</th>
              <th>ESI No</th>
              <th>Mobile No</th>
              <th>Authorized Person</th>
              <th>Authorized Person Contant Number</th>
              <th>Authorized Person Mail</th>
              <th>Email</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {customers.length > 0 ? (
              customers.map((customer) => (
                <tr key={customer.customerID}>
                  <td>{customer.TypeOfCustomer}</td>
                  <td>{customer.customerName}</td>
                  <td>{`${customer.address1}, ${customer.address2}, ${customer.address3}`}</td>
                  <td>{customer.city}</td>
                  <td>{customer.stateID}</td>
                  <td>{customer.countryID}</td>
                  <td>{customer.pincode}</td>
                  <td>{customer.gstNo}</td>
                  <td>{customer.tanNo}</td>
                  <td>{customer.pfNo}</td>
                  <td>{customer.esiNo}</td>
                  <td>{customer.mobileNo}</td>
                  <td>{customer.Authorized_Person}</td>
                  <td>{customer.Authorized_Person_Contant_Number}</td>
                  <td>{customer.Authorized_Person_Mail_Id}</td>
                  <td>{customer.emailID}</td>
                  <td>{customer.active}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="12">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerMaster;
