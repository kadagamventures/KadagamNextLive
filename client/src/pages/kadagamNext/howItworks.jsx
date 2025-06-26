import BlurImage from "../../assets/1. Dashboard.png";
import HybridImage from "../../assets/howitsworksecond.png";
import LeftAnalyticsImage from "../../assets/Group 1000002351.png"; // replace with your actual image
import RightAutomationImage from "../../assets/Group 1000002352.png"; // replace with your actual image
import LeftTableImage from "../../assets/Datatable.png";
import { Link } from "react-router-dom";


export default function ImageUploadPreview() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12 space-y-12">
      {/* Hero Section */}
      <div className="text-center px-4">
        <h1
          className=" mb-4 leading-tight"
          style={{
            fontFamily: "josefin sans !important",
            fontWeight: "700",
            fontSize: "45px",
            paddingBottom: "16px",
            height: "60px",
          }}
        >
          <span className="text-white">A </span>
          <span className="bg-gradient-to-r from-[#F7F7F7] to-[#585554] bg-clip-text text-transparent">
            smart project management platform for enterprises
          </span>
        </h1>

        <p
          className="mx-auto text-base md:text-lg"
          style={{
            width: "710px",
            fontFamily: "josefin sans !important",
            fontWeight: "500",
            fontSize: "20px",
            lineHeight: "30px",
            color: "rgba(162, 162, 162, 0.85)",
            paddingBottom: "24px",
          }}
        >
          Kadagam Next is a smart project management platform for enterprises
          to organize work, manage teams, and deliver projects on time — with
          everything in one place.
        </p>
        <button
          className="mt-6 bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded font-semibold"
          style={{
            width: "225px",
            height: "48px",
            borderRadius: "0px",
          }}
        >
          <Link
                    to="/signin"
                    
                  >SIGN UP FOR FREE</Link>
        </button>
      </div>

      {/* Image Section */}
      <div
        className="overflow-hidden shadow-2xl"
        style={{
          width: "720px",
          height: "512px",
        }}
      >
        <img
          src={BlurImage}
          alt="Dashboard Preview"
          className="w-full h-full object-cover rounded-[18px]"
        />
      </div>

      <p
        style={{
          width: "760px",
          fontFamily: "josefin sans !important",
          fontWeight: "700",
          fontSize: "40px",
          lineHeight: "60px",
        }}
      >
        <span className="bg-gradient-to-r from-[#F7F7F7] to-[#585554] bg-clip-text text-transparent">
          Kadagam Next gives you all you need to
        </span>
        <span className="bg-gradient-to-r from-[#F7F7F7] to-[#585554] bg-clip-text text-transparent">
          {" "}
          manage work and projects in one place
        </span>
      </p>

      {/* Scrolling Marquee Section */}
      <div className="marquee-wrapper">
        <div className="marquee-content">
          {[
            "Task Management",
            "Attendance Tracking",
            "Staff Assignment",
            "Project Planning",
            "Task Updates",
            "Reporting & Insights",
            "Billing & Plan Management",
          ].map((item, index) => (
            <span
              key={index}
              className="text-white whitespace-nowrap"
              style={{
                fontFamily: "josefin sans !important",
                fontWeight: "600",
                fontSize: "35px",
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* New Section */}
      <div
        className="flex items-center px-12 mb-4"
        style={{
          width: "1200px",
          height: "850px",
          borderRadius: "30px",
          background:
            "radial-gradient(50% 50% at 50% 50%, #FCDFD2 25.41%, #FFEFE6 100%)",
        }}
      >
        {/* Left Image Side */}
        <div className=" flex justify-center"
          style={{
            width: "500px",
            height: "616px",

          }}>
          <img
            src={HybridImage}
            alt="Hybrid Project Workflow"
            className="object-contain"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>

        {/* Right Text Side */}
        <div className="w-1/2 pl-15">
          <h2
            className=" mb-4"
            style={{
              fontFamily: "josefin sans !important",
              color: "#000",
              fontWeight: "700",
              fontSize: "40px",
              lineHeight: "56px",
              width: "510px"
            }}
          >
            Effortless Project Planning and Tracking
          </h2>
          <p
            className=" leading-8"
            style={{
              fontFamily: "josefin sans !important",
              width: "525px",
              textAlign: "justify",
              fontWeight: "500",
              fontSize: "20px",
              lineHeight: "32px",
              color: "rgba(92, 92, 92, 100%)",


            }}
          >
            KadagamNext adapts to your workflow – Agile, Waterfall, or a mix of
            both. Plan, track, and deliver tasks your way with smart tools and
            flexible project views that fit every team.
          </p>
        </div>
      </div>

      {/* third Section 3 */}

      <div
        className="flex px-12  items-center mb-5 gap-3"
        style={{
          width: "1300px",
          height: "850px",
          borderRadius: "30px",
          background: "black",
        }}
      >
        {/* Left Section */}
        <div
          className="w-1/2 pr-4 flex flex-col justify-between h-full py-8"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, #FCDFD2 25.41%, #FFEFE6 100%)",
            borderRadius: "30px",
          }}
        >
          <div className="px-4">
            <h2
              className="mb-4  pl-15"
              style={{
                fontFamily: "josefin sans !important",
                fontWeight: "700",
                fontSize: "34px",
                lineHeight: "48.37px",
                color: "#000",
              }}
            >
              KadagamNext Powering <br /> teamwork and productivity
            </h2>
            <p
              className="leading-7 pl-15 mb-6"
              style={{
                fontFamily: "josefin sans !important",
                fontWeight: "400",
                width: "500px",
                fontSize: "19px",
                lineHeight: "27.64px",
                textAlign: "justify",
                color: "rgba(92, 92, 92, 1)",

              }}
            >
              KadagamNext empowers flexible project workflows with clear, contextual
              collaboration across teams. Boost transparency and productivity to
              deliver your best work together.
            </p>
          </div>
          <img
            src={LeftAnalyticsImage}
            alt="Analytics Dashboard"
            style={{
              width: "449.77px",
              height: "502px",
              alignSelf: "center",
            }}
          />
        </div>

        {/* Right Section */}
        <div
          className="w-1/2 pl-4 flex flex-col justify-between h-full py-8"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, #FCDFD2 25.41%, #FFEFE6 100%)",
            borderRadius: "30px",
          }}
        >
          <div className="px-4 pl-16">
            <h2
              className="mb-4"
              style={{
                fontFamily: "josefin sans !important",
                fontWeight: "700",
                fontSize: "34px",
                lineHeight: "48.37px",
                color: "#000",
              }}
            >
              Work smarter, not harder, <br /> with automation
            </h2>
            <p
              className="text-base leading-7 mb-6"
              style={{
                fontFamily: "josefin sans !important",
                fontWeight: "400",
                fontSize: "19px",
                lineHeight: "27.64px",
                textAlign: "justify",
                color: "rgba(92, 92, 92, 1)",
                maxWidth: "460px",
              }}
            >
              Automate your leave workflows and handle time-off requests seamlessly,
              so your team can focus on what truly matters. However unique your
              policies may be, KadagamNext simplifies leave management to save time
              and reduce overhead.
            </p>
          </div>
          <img
            src={RightAutomationImage}
            alt="Leave Automation Table"
            style={{
              width: "459.46px",
              height: "287px",
              marginBottom: "65px",
              alignSelf: "center",
            }}
          />
        </div>
      </div>


      {/* Fourth Section */}
      <div
        className="relative flex flex-col justify-between px-12 py-8"
        style={{
          width: "1200px",
          height: "650px",
          borderRadius: "30px",
          background: "rgba(41, 1, 2, 1)",
        }}
      >
        {/* Top Content Area */}
        <div className="flex items-center h-full">
          {/* Left Section */}
          <div className="w-1/2 pr-8 flex justify-center">
            <img
              src={LeftTableImage}
              alt="Project Table"
              style={{
                width: "569px",
                height: "400px",
              }}
            />
          </div>

          {/* Right Section */}
          <div className="w-1/2 pl-8 flex flex-col justify-center">
            <h2
              className="mb-4"
              style={{
                fontFamily: "josefin sans !important",
                fontWeight: "700",
                fontSize: "35.29px",
                lineHeight: "49.41px",
                color: "#fff",
              }}
            >
              Better Results with <br /> Flexible Project Planning
            </h2>
            <p
              className="leading-7"
              style={{
                fontFamily: "josefin sans !important",
                fontWeight: "400",
                fontSize: "19.41px",
                lineHeight: "28.24px",
                textAlign: "justify",
                color: "#A8A8A8",
                maxWidth: "460px",
              }}
            >
              KadagamNext lets your team manage projects in a way that works best
              for them. From planning to progress tracking, everything is simple,
              clear, and easy to follow. Work better together and achieve more with
              flexible tools made for real teamwork.
            </p>
          </div>
        </div>

        {/* Bottom Centered Button */}
        <div className="flex justify-center mt-4">
          <button
            style={{
              padding: "10px 28px",
              backgroundColor: "#fff",
              color: "#000",
              borderRadius: "20px",
              fontWeight: "600",
              fontSize: "16px",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
            }}
          >
            <a href="/signin">Next</a>
          </button>
        </div>
      </div>


    </div>
  );
}
