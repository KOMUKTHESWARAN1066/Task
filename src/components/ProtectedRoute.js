import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token"); // ✅ Ensure token is checked

  return token ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
