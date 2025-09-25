import { useState, useEffect } from "react";
import axios from "axios";

const Header = () => {
  const [companyName, setCompanyName] = useState("");
 
  const empname = localStorage.getItem("empname") || "";
const loginTime = localStorage.getItem("time") || "";

  useEffect(() => {
    axios
      .get("https://103.38.50.149:5001/api/company")
      .then((response) => {
        if (response.data && response.data.header) {
          setCompanyName(response.data.header);
        }
      })
      .catch((error) => {
        console.error("Error fetching company header:", error);
      });
  }, []);

  return (
    <header className="bg-blue-600 text-white text-lg md:text-2xl font-semibold p-4 shadow-md w-full flex items-center relative">
    <h3>  {companyName || "Loading..."}</h3>
  
    {empname && loginTime && (
      <p className="text-sm md:text-lg">
        <strong>👤 {empname} | ⏱ {loginTime}</strong>
      </p>
    )}

 
</header>

  );
};

export default Header;
