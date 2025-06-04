// 📂 src/hooks/AxiosAuthProvider.jsx
import useAxiosAuth from './useAxiosAuth';

const AxiosAuthProvider = () => {
  useAxiosAuth(); // Only call AFTER inside Router tree
  return null; // This component doesn't render anything
};

export default AxiosAuthProvider;
