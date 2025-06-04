import { useState} from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import bgImage from '../../assets/backimage.png';
import kadagamLogo from '../../assets/kadagamlogo.png';
import { FiMail } from 'react-icons/fi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        { email }
      );
      setMessage(data.message);
      setTimeout(() => navigate('/staff/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex"
      style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Left branding */}
      <div className="w-1/2 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-6xl font-bold" style={{ fontFamily: 'Inter', lineHeight: 1 }}>
            <span className="text-red-500">Kadagam</span>{' '}
            <span className="text-blue-600">Next</span>
          </h1>
          <p className="text-white text-2xl font-semibold mt-4">Your ultimate workspace</p>
        </div>
      </div>

      {/* Right form card */}
      <div className="w-1/2 relative flex items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="absolute inset-x-0 top-16 mx-auto w-[393px] bg-white rounded-2xl p-10 flex flex-col items-start gap-6"
        >
          {/* Logo */}
          <div className="w-full flex justify-center">
            <img src={kadagamLogo} alt="Logo" className="w-16 h-16 rounded-full mb-2" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 self-center">Forgot Password?</h2>
          <p className="text-sm text-gray-600 self-center mb-4">
            Enter your email to receive a reset link.
          </p>

          {message && <p className="w-full text-green-600 bg-green-100 p-2 rounded text-center">{message}</p>}
          {error && <p className="w-full text-red-500 bg-red-100 p-2 rounded text-center">{error}</p>}

          
          <div className="w-full relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your email"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-blue-500"
            />
            <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>


          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/staff/login')}
            className="mt-2 text-sm text-blue-600 hover:underline self-center"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
