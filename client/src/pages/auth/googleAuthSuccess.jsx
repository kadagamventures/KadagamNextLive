import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function GoogleAuthSuccess() {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");
    if (token) {
      // Store token for API authentication
      localStorage.setItem("authToken", token);

      let companyId;
      try {
        const decoded = jwtDecode(token);
        companyId = decoded.companyId || decoded.companyID || decoded.company_id;
      } catch (e) {
        // Invalid token, fallback
        companyId = null;
      }

      if (companyId) {
        navigate("/company-details", { state: { companyId } });
      } else {
        navigate("/admin/login");
      }
    } else {
      navigate("/admin/login");
    }
  }, [navigate, search]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl">Authenticating with Google...</p>
    </div>
  );
}
