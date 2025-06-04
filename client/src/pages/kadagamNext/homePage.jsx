
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/solid';
import heroImage from '../../assets/hero-image.jpg';

export default function HeroSection() {
  return (
    <section className="relative bg-black text-white min-h-screen flex items-center justify-center overflow-hidden">
      {/* Sign In Button */}
      <div className="absolute top-6 right-6">
        <Link
          to="/signin"
          className="py-2 px-5 border border-white rounded-full hover:bg-white hover:text-black transition duration-300 mr-4 "
        >
          Signin
        </Link>
        <Link
          to="/about"
          className="py-2 px-5 border border-white rounded-full hover:bg-white hover:text-black transition duration-300"
        >
          About
        </Link>
      </div>

      <div className="flex w-full h-full">
        {/* Text Content: center vertically and horizontally in left half */}
        <div
          className="w-full md:w-1/2 flex items-center justify-center px-8 lg:px-24 z-10"
          style={{ fontFamily: 'Josefin Sans, sans-serif' }}
        >
          <div>
            <h1 className="text-[69px] leading-[76px] font-bold tracking-normal">
              <span className="bg-gradient-to-r from-[#F7F7F7] to-[#585554] text-transparent bg-clip-text">
                Introducing
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#F7F7F7] to-[#585554] text-transparent bg-clip-text">
                Kadagam Next
              </span>
            </h1>
            <p
              className="mt-4 text-[22px] leading-[30px] tracking-normal text-gray-400"
              style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 300 }}
            >
              Seamless task management for every achiever.
            </p>
            <Link
              to="/try"
              className="mt-8 inline-flex items-center justify-center w-[203px] h-[42px] border-[1.5px] rounded-[69px] px-[13px] border-[rgba(199,199,199,1)] font-medium transition hover:bg-gray-800"
              style={{ fontFamily: 'Josefin Sans, sans-serif' }}
            >
              Try Kadagam Next
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>

        {/* Image */}
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <img
            src={heroImage}
            alt="Woman working on laptop"
            className="w-full h-auto max-h-screen object-contain rounded-xl shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
