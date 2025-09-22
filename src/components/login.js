import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./style.css";
import { useNavigate } from "react-router-dom";

const Login = ({ setToken }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [Errormes, setError] = useState("");
  const [companies, setCompanies] = useState([]);   // Company list state
  const [compid, setCompid] = useState("");         // Selected company ID

  useEffect(() => {
    // Fetch company list from the backend on component mount
    axios
      .get("https://103.38.50.149:5001/api/companies-details")
      .then((res) => setCompanies(res.data))
      .catch(() => setCompanies([]));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Get the client IP address
      const ipResponse = await axios.get("https://api64.ipify.org?format=json");
      const clientIp = ipResponse.data.ip;

      // Send login request with username, password, selected company, and client IP
      const response = await axios.post(
        "https://103.38.50.149:5001/api/login",
        {
          username,
          password,
          compid,   // <-- Send selected company ID
          clientIp, // Attach IP address
        }
      );

      console.log("res", response.data);
      if (response.data.success) {
        toast.success("Login Successful!");
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("time", response.data.time);
        localStorage.setItem("logID", response.data.logID);
        localStorage.setItem("flag", response.data.Flag);
        localStorage.setItem("empname", response.data.employeeName);
        localStorage.setItem("empID", response.data.employeeID);
        setToken(response.data.token); // ✅ Update App.js state
        navigate("/Home");
      } else {
        setError(response.data.message || "Invalid credential");
        toast.error(response.data.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login Error:", error); // ✅ Log the full error object
      if (error.response) {
        console.log("Error Response Data:", error.response.data);
        console.log("Error Status Code:", error.response.status);

        if (error.response.data && error.response.data.message) {
          setError(error.response.data.message);
          toast.error(error.response.data.message);
        } else {
          setError("Invalid credentials. Please try again.");
          toast.error("Invalid credentials. Please try again.");
        }
      } else {
        setError("Something went wrong. Please try again.");
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-box">
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {Errormes && <p style={{ color: "red" }}>{Errormes}</p>}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <select
              value={compid}
              onChange={(e) => setCompid(e.target.value)}
              required
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={c.COMPID} value={c.COMPID}>
                  {c.COMPNAME}
                </option>
              ))}
            </select>
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
