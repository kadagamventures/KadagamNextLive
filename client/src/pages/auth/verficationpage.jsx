// src/pages/auth/VerificationPage.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import bgImage from '../../assets/backimage.png';
import { tokenRefreshInterceptor as api } from '../../utils/axiosInstance';

export default function VerificationPage() {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Expect companyId and email from previous page
  const { companyId, email } = location.state || {};

  useEffect(() => {
    // If accessed directly or missing state, send back to signup
    if (!companyId || !email) {
      navigate('/signin', { replace: true });
    }
  }, [companyId, email, navigate]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);
    if (value && index < otp.length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const code = otp.join('');
    if (code.length < otp.length) {
      setError(`Please enter the ${otp.length}-digit code.`);
      return;
    }

    try {
      await api.post('/company/verify', { companyId, code });
      // After successful verification, navigate to Admin Login
      navigate('/admin/login', {
        state: { prefillEmail: email },
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Verification failed. Please try again.'
      );
    }
  };

  const handleResend = async () => {
    setResendMessage('');
    try {
      await api.post('/company/resend-otp', { companyId });
      setResendMessage('Code resent. Check your inbox.');
    } catch {
      setResendMessage('Could not resend code. Try again later.');
    }
  };

  return (
    <div
      className="relative min-h-screen flex"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Left branding */}
      <div className="w-1/2 flex items-center justify-center bg-opacity-30">
        <div className="text-left px-12">
          <h1 className="text-white text-6xl font-bold mb-4">
            Kadagam Next
          </h1>
          <p className="text-white text-xl">Your ultimate workspace</p>
        </div>
      </div>

      {/* Right verification form */}
      <div className="w-1/2 flex items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="w-[360px] bg-white rounded-2xl p-8 flex flex-col items-center gap-6 shadow-lg"
        >
          <h2 className="text-xl font-semibold text-gray-800">
            Enter Verification Code
          </h2>
          <p className="text-sm text-gray-600 text-center">
            We sent a {otp.length}-digit code to
          </p>
          <input
            type="email"
            value={email || ''}
            disabled
            className="w-full px-3 py-2 text-center border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
          />

          <div className="flex gap-3">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                className={`w-12 h-12 text-center border border-gray-300 rounded-lg focus:outline-blue-500 transition ${
                  digit ? 'bg-green-100' : 'bg-white'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}
          {resendMessage && (
            <p className="text-green-600 text-sm text-center">
              {resendMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleResend}
            className="text-sm text-blue-500 hover:underline"
          >
            Didn’t receive OTP? Resend OTP
          </button>

          <button
            type="submit"
            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
          >
            Submit
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/login', { replace: true })}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
