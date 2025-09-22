import { useState, useEffect } from "react";
import axios from "axios";

const Footer = () => {
  const [footerText, setFooterText] = useState("");

  useEffect(() => {
    axios
      .get("https://103.38.50.149:5001/api/company")
      .then((response) => {
        if (response.data && response.data.footer) {
          setFooterText(response.data.footer);
        }
      })
      .catch((error) => {
        console.error("Error fetching footer text:", error);
      });
  }, []);

  return <footer className="">{footerText || "Loading..."}</footer>;
};

export default Footer;
