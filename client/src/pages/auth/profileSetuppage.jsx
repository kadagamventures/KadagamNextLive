import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaUpload } from 'react-icons/fa';
import bgImage from '../../assets/backimage.png';

export default function ProfileSetupPage() {
  const [avatar, setAvatar] = useState();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [updates, setUpdates] = useState(false);
  const [training, setTraining] = useState(false);
  const [iconsVisible, setIconsVisible] = useState(false);
  const navigate = useNavigate();
  const fileRef = useRef(null);

  // show icons only after component mounts (simulating fetch)
  useEffect(() => {
    setIconsVisible(true);
  }, []);

  const isContinueEnabled = name.trim() !== '' && email.trim() !== '' && phone.trim() !== '';

  const handleContinue = (e) => {
    e.preventDefault();
    if (isContinueEnabled) navigate('/dashboard');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className="relative min-h-screen flex"
      style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Left branding */}
      <div className="w-1/2 flex items-center justify-center bg-opacity-30">
        <div className="text-left px-12">
          <h1 className="text-white text-6xl font-bold mb-4" style={{ fontFamily: 'Inter', lineHeight: 1 }}>
            Kadagam Next
          </h1>
          <p className="text-white text-xl">Your ultimate workspace</p>
        </div>
      </div>

      {/* Right form card (no internal scroll) */}
      <div className="w-1/2 flex items-center justify-center">
        <form
          onSubmit={handleContinue}
          className="w-[380px] h-[550px] bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-lg"
        >
          <h2 className="text-2xl font-bold text-gray-900">Create your Account</h2>

          {/* Avatar upload */}
          <div className="relative">
            <img src={avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
            <label htmlFor="avatarUpload" className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600">
              <FaUpload size={14} />
            </label>
            <input
              id="avatarUpload"
              type="file"
              accept="image/*"
              ref={fileRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Inputs */}
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-blue-500"
            required
          />
          <input
            type="email"
            placeholder="Enter your email id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-blue-500"
            required
          />
          <input
            type="tel"
            placeholder="Enter your phone no"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-blue-500"
            required
          />

          {/* Checkboxes */}
          <div className="w-full flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={updates}
                onChange={() => setUpdates(!updates)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              I agree to receive product updates, special offers, and news via email
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={training}
                onChange={() => setTraining(!training)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              I want to receive training
            </label>
          </div>

          {/* Continue */}
          <button
            type="submit"
            disabled={!isContinueEnabled}
            className={`w-full py-2 font-semibold rounded-lg transition ${isContinueEnabled
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            Continue
          </button>

          {/* Terms & Social */}
          <p className="text-xs text-gray-500 text-center">
            By signing up, you agree to our{' '}
            <a href="/terms-conditions" className="underline text-blue-500">Terms</a> and{' '}
            <a href="/privacy-policy" className="underline text-blue-500">Privacy</a>.
          </p>
          {iconsVisible && (
            <div className="flex gap-4 mt-auto">
              <FcGoogle size={20} className="cursor-pointer" />
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
