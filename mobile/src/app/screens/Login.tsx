import { useNavigate } from "react-router";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Phone, Mail } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Login() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white max-w-[430px] mx-auto">
      <ImageWithFallback
        src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"
        alt="Event"
        className="w-full h-64 object-cover rounded-b-[32px]"
      />

      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Enter your mobile number
        </h1>
        <p className="text-gray-600 mb-8">
          We'll send you a verification code
        </p>

        <div className="space-y-4 mb-6">
          <div className="flex gap-3">
            <select className="px-4 py-3.5 rounded-2xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white">
              <option>+1</option>
              <option>+44</option>
              <option>+91</option>
            </select>
            <Input
              type="tel"
              placeholder="Mobile number"
              icon={<Phone size={20} />}
              className="flex-1"
            />
          </div>
        </div>

        <Button onClick={handleLogin} className="w-full mb-6">
          Login
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">OR</span>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <Button variant="secondary" className="w-full flex items-center justify-center gap-3">
            <Mail size={20} />
            Continue with Google
          </Button>
          <Button variant="secondary" className="w-full flex items-center justify-center gap-3">
            <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </Button>
        </div>

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <button onClick={() => navigate("/signup")} className="text-purple-600 font-semibold">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
