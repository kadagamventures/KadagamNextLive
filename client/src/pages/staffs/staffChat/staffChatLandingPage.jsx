
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  // MessageSquareText,
  UserCog,
  UserCircle2,
} from "lucide-react";

const StaffChatLandingPage = () => {
  const navigate = useNavigate();

  const handleGoToPage = (path) => navigate(path);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const buttonVariants = {
    initial: { opacity: 0, y: 10 },
    animate: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1 + 0.3,
        duration: 0.4,
        ease: "easeOut",
      },
    }),
    tap: { scale: 0.97 },
    hover: { scale: 1.03 },
  };

  const chatOptions = [
    {
      label: "View & Manage Staff Chats",
      icon: <UserCog className="w-6 h-6" />,
      to: "/staff/chat/permissioned-manager",
      gradient: "from-blue-600 to-indigo-700",
    },
    {
      label: "Chats Assigned to Me",
      icon: <UserCircle2 className="w-6 h-6" />,
      to: "/staff/chat/permissioned-staff",
      gradient: "from-purple-500 to-pink-600",
    },
    
  ];

  return (
    <div className="animated-gradient w-full h-screen flex items-center justify-center pl-50">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-xl bg-white/80 backdrop-blur-md shadow-2xl rounded-3xl p-10 text-center space-y-6"
      >
        <h1 className="text-4xl font-extrabold text-gray-900">Chat Hub</h1>
        <p className="text-gray-700">
          Choose how you’d like to connect and stay on top of your tasks!
        </p>

        <div className="space-y-4">
          {chatOptions.map((btn, i) => (
            <motion.button
              key={btn.to}
              custom={i}
              initial="initial"
              animate="animate"
              whileTap="tap"
              whileHover="hover"
              variants={buttonVariants}
              onClick={() => handleGoToPage(btn.to)}
              className={`w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl text-lg font-semibold text-white bg-gradient-to-r ${btn.gradient} transition-shadow`}
            >
              {btn.icon}
              {btn.label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default StaffChatLandingPage;
