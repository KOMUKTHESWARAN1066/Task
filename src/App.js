import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import Login from "./components/login";
import CustomerMaster from "./components/CustomerMaster";
import CountryMaster from "./components/CountryMaster";
import StateMaster from "./components/StateMaster";
import JobMaster from "./components/JobMaster";
import JobTypeMaster from "./components/JobTypeMaster";
import EmployeeMaster from "./components/EmployeeMaster";
import CustomerJobMaster from "./components/CustomerJobMaster";
import ProtectedRoute from "./components/ProtectedRoute";
import EmployeeJobs from "./components/EmployeeJobs";
import Billed from "./components/Billed";
import Payment from "./components/payment";
import Payment_completed from "./components/Payment_completed";
import "./menu.css";
import Header from "./components/header";
import Footer from "./components/footer";
import Home from "./components/Home";
import Customer_sales from "./components/sales";

const App = () => {
  const [submenuOpen, setSubmenuOpen] = useState({
    general: false,
    job: false,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const flag = localStorage.getItem("flag");
  const empname = localStorage.getItem("empname");

  
  
  const navigate = useNavigate();

  // ✅ Manual Logout Function
  const handleLogout = async () => {
    const logID = localStorage.getItem("logID");
    const empid = localStorage.getItem("empID");

    if (!logID) {
        console.warn("No logID found in localStorage.");
        return;
    }

    try {
        await axios.post("https://103.38.50.149:5001/api/logout", { logID });

        // ✅ Clear only necessary items from localStorage
        localStorage.removeItem("logID");
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("empname");
        localStorage.removeItem("empID");
        localStorage.removeItem("flag");

        // ✅ Notify other tabs that THIS specific user logged out
        localStorage.setItem("logout_user", empid);
        window.dispatchEvent(new Event("storage"));

        // ✅ Redirect to login page
        setToken(null);
        navigate("/");

        // ✅ Force a full page reload to remove UI traces
        setTimeout(() => window.location.reload(), 100);
    } catch (error) {
        console.error("Logout failed:", error.response?.data || error.message);
    }
};

useEffect(() => {
  const storedToken = localStorage.getItem("token");
  const currentUser = localStorage.getItem("empID");
 

  if (storedToken) {
      let lastPage = sessionStorage.getItem("lastPage");
      let count = parseInt(sessionStorage.getItem("count"), 10) || 0;
      // ✅ If lastPage is "/" (login page) or null, go to Home
      if (!lastPage || lastPage === "/") {
          lastPage = "/Home";
          if(count===0){
            navigate(lastPage);
            count++;
            sessionStorage.setItem("count", count.toString());
           
          }

          
      }
      
      
  } else {
    
      navigate("/"); 
    
  }

  const handleStorageChange = (event) => {
      if (event.key === "logout_user") {
          const loggedOutUser = event.newValue;
          if (loggedOutUser === currentUser) {  
              navigate("/");
              setTimeout(() => window.location.reload(), 100);
          }
      }
  };

  // ✅ Handle screen resize to show/hide menu
  const handleResize = () => {
      setMenuOpen(window.innerWidth >= 1024);
  };

  handleResize(); 

  window.addEventListener("resize", handleResize);
  window.addEventListener("storage", handleStorageChange);

  // ✅ Save the last visited page before navigation
  const savePage = () => {
      const currentPage = window.location.pathname;
      if (currentPage !== "/") {
          sessionStorage.setItem("lastPage", currentPage);
          sessionStorage.setItem("count", "0"); // ✅ Correct

          
          

      }
  };

  window.addEventListener("beforeunload", savePage);
  window.addEventListener("popstate", savePage); 

  return () => {
      window.removeEventListener("beforeunload", savePage);
      window.removeEventListener("popstate", savePage);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("storage", handleStorageChange);
  };
}, [navigate]);


  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleSubmenu = (menu) => {
    setSubmenuOpen((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleMenuClick = (event) => {
    if (window.innerWidth < 1024) {
      setMenuOpen(false);
      event.stopPropagation();
    }
  };

  return (
    <div className="cont">
      <Header />
      <ProtectedRoute>
      {token &&  (
        <>
          <button className="menu-button" onClick={toggleMenu}>
            ☰ Menu
          </button>
          {menuOpen && (
            <nav className="nav container">

              <div className={`nav__menu ${menuOpen ? "menuOpen" : ""}`}>
                
                <ul className="nav__list">
                  
                    <>
                      <li>
                        <Link to="/Home" className="nav__link">🏠 Home</Link>
                      </li>
                      <li>
                        <span className="nav__link" onClick={() => toggleSubmenu("general")}>
                          General {submenuOpen.general ? "▲" : "▼"}
                        </span>
                        {submenuOpen.general && (
                          <ul className={`submenu ${submenuOpen.general ? "submenu-open" : ""}`}>
                            <li className="nav__item"><Link to="/country" className="nav__link">Country</Link></li>
                            <li className="nav__item"><Link to="/state" className="nav__link">State</Link></li>
                          </ul>
                        )}
                      </li>
                      <li>
                        <span className="nav__link" onClick={() => toggleSubmenu("job")}>
                          Job Master {submenuOpen.job ? "▲" : "▼"}
                        </span>
                        {submenuOpen.job && (
                          <ul className={`submenu ${submenuOpen.job ? "submenu-open" : ""}`}>
                            <li className="nav__item"><Link to="/job-type" className="nav__link">Job Type</Link></li>
                            <li className="nav__item"><Link to="/job" className="nav__link">Job</Link></li>
                          </ul>
                        )}
                      </li>
                      {flag?.toLowerCase() === "true" && (
                        <li className="nav__item"><Link to="/employee" className="nav__link">Employee Master</Link></li>
                      )}
                      <li className="nav__item"><Link to="/customer" className="nav__link">Customer Master</Link></li>
                      <li className="nav__item"><Link to="/customer-job" className="nav__link">Customer Job Master</Link></li>
                      <li className="nav__item"><Link to="/employee-jobs" className="nav__link">Pending Jobs</Link></li>
                      <li className="nav__item"><Link to="/Billed" className="nav__link">To Be Billed</Link></li>
                      <li className="nav__item"><Link to="/Payment" className="nav__link">Pending Payments</Link></li>
                      <li className="nav__item"><Link to="/Payment_completed" className="nav__link">Completed Jobs</Link></li>
                      <li className="nav__item"><Link to="/Customer_sales" className="nav__link">Customer Purchase & Sales</Link></li>
                      <li className="nav__item">
                        <button className="button button__header" onClick={handleLogout}>Logout</button>
                      </li>
                    </>
                 
                </ul>
              
              </div>
            </nav>
          )}
        </>
      )}</ProtectedRoute>
      <div className="content">
        <Routes>
          <Route path="/" element={<Login setToken={setToken} />} />
          <Route path="/Home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/customer" element={<ProtectedRoute><CustomerMaster /></ProtectedRoute>} />
          <Route path="/state" element={<ProtectedRoute><StateMaster /></ProtectedRoute>} />
          <Route path="/country" element={<ProtectedRoute><CountryMaster /></ProtectedRoute>} />
          <Route path="/employee" element={<ProtectedRoute><EmployeeMaster /></ProtectedRoute>} />
          <Route path="/job-type" element={<ProtectedRoute><JobTypeMaster /></ProtectedRoute>} />
          <Route path="/job" element={<ProtectedRoute><JobMaster /></ProtectedRoute>} />
          <Route path="/customer-job" element={<ProtectedRoute><CustomerJobMaster /></ProtectedRoute>} />
          <Route path="/employee-jobs" element={<ProtectedRoute><EmployeeJobs /></ProtectedRoute>} />
          <Route path="/Billed" element={<ProtectedRoute><Billed /></ProtectedRoute>} />
          <Route path="/Payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/Payment_completed" element={<ProtectedRoute><Payment_completed /></ProtectedRoute>} />
          <Route path="/Customer_sales" element={<ProtectedRoute><Customer_sales /></ProtectedRoute>} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
};

export default App;
