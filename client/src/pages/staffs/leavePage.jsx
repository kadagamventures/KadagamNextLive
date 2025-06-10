import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { submitLeaveRequest } from "../../redux/slices/leaveRequestSlice";
import { useNavigate } from "react-router-dom"; // Import useNavigate

const StaffLeaveRequest = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate(); // Use the useNavigate hook
  const { loading, error, success } = useSelector(
    (state) =>
      state.leaveRequest || { loading: false, error: null, success: false }
  );

  const [requestType, setRequestType] = useState("leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const staffEmail = localStorage.getItem("staffEmail") || "";
    setEmail(staffEmail);
  }, []);

  useEffect(() => {
    if (success) {
      setMessage("Request submitted successfully!");
      // Navigate after a delay of 2 seconds on successful submission
      const timer = setTimeout(() => {
        navigate("/staff/profile"); // <--- CHANGE THIS PATH TO YOUR ACTUAL PROFILE PAGE PATH
        // Optionally, dispatch an action to clear the leave request status if you have one
        // dispatch(clearLeaveRequestStatus());
      }, 2000); // 2 seconds delay
      return () => clearTimeout(timer); // Cleanup the timer on component unmount or re-render
    }
    if (error) {
      setMessage("Error submitting request. Please try again later.");
      // Clear error message after some time
      const errorTimer = setTimeout(() => {
        setMessage("");
      }, 5000); // Clear error message after 5 seconds
      return () => clearTimeout(errorTimer);
    }
  }, [success, error, navigate]); // Add navigate to the dependency array

  // Effect to reset form fields after successful submission
  useEffect(() => {
    if (success) {
      setRequestType("leave");
      setStartDate("");
      setEndDate("");
      setReason("");
      // No need to reset email as it's fetched from localStorage
    }
  }, [success]);


  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic date validation: Start Date cannot be after End Date
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setMessage("Start Date cannot be after End Date.");
      return; // Stop submission
    }

    const type = requestType === "work-from-home" ? "workfromhome" : "leave";
    const payload = { type, startDate, endDate, reason, contactEmail: email };
    dispatch(submitLeaveRequest(payload));
  };

  return (
    <div className="min-h-screen flex items-center justify-center pl-64 bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Leave / Work From Home Request
        </h1>

        {/* Display message based on success or error state */}
        {message && (
          <p
            className={`mb-4 text-center font-medium ${
              success ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Request Type & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Request Type</label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-violet-700"
              >
                <option value="leave">Leave</option>
                <option value="work-from-home">Work From Home</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                placeholder="Enter your email"
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white-100 focus:outline-none focus:ring-2 focus:ring-violet-700"
                required
              />
            </div>
          </div>

          {/* Row 2: Start & End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-violet-700"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-violet-700"
                required
              />
            </div>
          </div>

          {/* Row 3: Reason */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-violet-700"
              rows="4"
              placeholder="Enter your reason for the request..."
              required
            ></textarea>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="w-50 bg-violet-600 text-white font-semibold py-3 rounded-full hover:bg-violet-700 transition-all shadow-md"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffLeaveRequest;